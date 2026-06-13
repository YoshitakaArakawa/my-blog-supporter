#!/usr/bin/env python3
"""WixブログのMHTMLスナップショットから記事本文を抽出する。

MHTMLはWixダッシュボードのブログ編集ページを丸ごと保存したもので、
内部に記事プレビューのレンダリング結果(text/htmlパート)を含む。
そのパートの post-title / post-description コンテナだけをサブツリー抽出し、
サイトのナビ・カテゴリ・フッターを構造的に排除する。

見出し(h1-h6)・区切り線(div type=divider)・リスト(li)は Wix の DOM 構造に
実在するため、それを Markdown(見出し記号 / --- / - )に忠実変換する。
構造に無いマークアップは足さない(フォントサイズ等からの見出し推測はしない)。

依存: Python 3 標準ライブラリのみ(email, html.parser)。追加パッケージ不要。

使い方:
    python extract_wix_mhtml.py <input.mhtml> <output.md>
"""
import sys
import re
import email
from email import policy
from html.parser import HTMLParser

# HTMLの空要素。終了タグを持たないためdepth計算から除外する(含めるとdepthが
# 0に戻らずコンテナを抜けても捕捉が続き、フッター等が混入する)。
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr'}
# 1ブロック(段落)の境界になる要素。これらの開始/終了で現在のブロックを確定する。
BLOCK = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'tr',
         'blockquote', 'section', 'ul', 'ol', 'li', 'pre'}
HEADING = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}


class ContainerExtractor(HTMLParser):
    """data-hook=<hook> の要素サブツリーを、ブロック単位でテキスト化する。

    depthで対象要素の入れ子を追跡し、その要素が閉じたら捕捉を止める。
    script/style/noscriptの中身は捨てる。各ブロックには種別(段落 / 見出しh1-h6
    / リスト項目li / 区切り線hr)を持たせ、render()でMarkdownに変換する。

    Wix固有の2点に注意:
    - リスト項目は <li><p>...</p></li> と内側に <p> を持つため、li の中にいる
      間(in_li)は内側 <p> でも種別を li に保つ(でないとマーカー '-' が落ちる)。
    - 段落を <pre>(整形済み)に入れる場合があり、改行がリテラル \\n になる。
      pre内(in_pre)は空白正規化で改行を潰さず、行ごとに段落へ分割する。
    """

    def __init__(self, hook):
        super().__init__(convert_charrefs=True)
        self.hook = hook
        self.depth = 0
        self.capturing = False
        self.skip = 0            # script/style/noscriptのネスト数
        self.blocks = []         # 確定したブロック [(kind, text), ...]
        self.buf = []            # 現在組み立て中のブロックのテキスト断片
        self.kind = 'p'          # 現在のブロック種別
        self.in_li = False       # <li> サブツリー内か
        self.in_pre = False      # <pre> サブツリー内か

    def _flush(self):
        """組み立て中のテキスト断片を1ブロックとして確定する。

        pre内は行ごとに別段落へ分割し、改行を保つ。それ以外は連続空白を
        1つに正規化して1ブロックにまとめる。
        """
        raw = ''.join(self.buf)
        self.buf = []
        if self.in_pre:
            for line in raw.splitlines():
                line = re.sub(r'[ \t]+', ' ', line).strip()
                if line:
                    self.blocks.append(('p', line))
        else:
            text = re.sub(r'\s+', ' ', raw).strip()
            if text:
                self.blocks.append((self.kind, text))
        self.kind = 'li' if self.in_li else 'p'

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if not self.capturing and a.get('data-hook') == self.hook:
            self.capturing = True
            self.depth = 0
        if not self.capturing:
            return
        if tag not in VOID:
            self.depth += 1
        if tag in ('script', 'style', 'noscript'):
            self.skip += 1
            return
        # 区切り線(Wixは空divに type=divider を付ける)は独立ブロックとして残す。
        if a.get('type') == 'divider':
            self._flush()
            self.blocks.append(('hr', ''))
            return
        # <br> は段落内の改行。pre以外では段落の区切りとして扱う。
        if tag == 'br' and not self.in_pre:
            self._flush()
            return
        # ブロック境界では現在のブロックを確定し、新しいブロックの種別を決める。
        if tag in BLOCK:
            self._flush()
            if tag == 'pre':
                self.in_pre = True
            if tag == 'li':
                self.in_li = True
                self.kind = 'li'
            elif tag in HEADING:
                self.kind = tag
            else:
                # p/div/section等。li の中なら li を維持する。
                self.kind = 'li' if self.in_li else 'p'

    def handle_endtag(self, tag):
        if not self.capturing:
            return
        if tag in ('script', 'style', 'noscript') and self.skip > 0:
            self.skip -= 1
            return
        if tag in BLOCK:
            self._flush()
            if tag == 'pre':
                self.in_pre = False
            if tag == 'li':
                self.in_li = False
        if tag not in VOID:
            self.depth -= 1
            if self.depth <= 0:
                self._flush()
                self.capturing = False

    def handle_data(self, data):
        # pre内は空白だけの行(意図的な改行)も保持する。
        if self.capturing and self.skip == 0 and (self.in_pre or data.strip()):
            self.buf.append(data)

    def render(self):
        """確定ブロックをMarkdown文字列に組み立てる。

        見出し→#記号、区切り線→---、リスト項目→- を付与する。
        段落・見出し・区切り線は空行で区切り、連続するリスト項目だけは
        空行を挟まず詰める(Markdownのリストを保つ)。
        """
        items = []
        for kind, text in self.blocks:
            if kind == 'hr':
                items.append(('hr', '---'))
            elif kind in HEADING:
                items.append(('h', '#' * int(kind[1]) + ' ' + text))
            elif kind == 'li':
                items.append(('li', '- ' + text))
            else:
                items.append(('p', text))
        out = ''
        for i, (kind, line) in enumerate(items):
            if i > 0:
                tight = kind == 'li' and items[i - 1][0] == 'li'
                out += '\n' if tight else '\n\n'
            out += line
        return out.strip()


def html_parts(path):
    """MHTMLを解析し、text/htmlパートの本文をUTF-8文字列で返す。"""
    with open(path, 'rb') as f:
        msg = email.message_from_binary_file(f, policy=policy.default)
    out = []
    for part in msg.walk():
        if part.get_content_type() == 'text/html':
            payload = part.get_payload(decode=True)
            if payload:
                # MIMEヘッダにcharsetが無く、HTML内metaがUTF-8のため固定デコード。
                out.append(payload.decode('utf-8', 'replace'))
    return out


def extract(htmls):
    """全text/htmlパートからpost-descriptionを試し、最長のものを採用する。

    Wixはダッシュボード外殻と記事プレビューを別パートとして保存する。
    どのパートに本文があるかをハードコードせず、抽出結果の長さで選ぶ。
    """
    best_body, best_title = '', ''
    for html in htmls:
        d = ContainerExtractor('post-description')
        d.feed(html)
        body = d.render()
        if len(body) > len(best_body):
            best_body = body
            t = ContainerExtractor('post-title')
            t.feed(html)
            # タイトルは1行の見出しなので記号や改行を落として素のテキストにする。
            best_title = re.sub(r'\s+', ' ',
                                t.render().lstrip('#- ').replace('\n', ' ')).strip()
    return best_title, best_body


def main():
    if len(sys.argv) != 3:
        sys.exit('usage: python extract_wix_mhtml.py <input.mhtml> <output.md>')
    src, dst = sys.argv[1], sys.argv[2]
    try:
        htmls = html_parts(src)
    except FileNotFoundError:
        sys.exit(f'error: ファイルが見つかりません: {src}')
    if not htmls:
        sys.exit('error: MHTML内にtext/htmlパートがありません。'
                 'Wixの保存形式を確認してください。')
    title, body = extract(htmls)
    if not body:
        sys.exit('error: 記事本文(data-hook=post-description)が見つかりませんでした。'
                 'ダッシュボードのみのスナップショットでプレビューが'
                 '含まれていない可能性があります。')
    md = f'# {title}\n\n{body}\n' if title else f'{body}\n'
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(md)
    heads = body.count('\n## ') + body.count('\n### ')
    print(f'OK title={title!r}')
    print(f'OK output={dst}')
    print(f'OK body_chars={len(body)} body_lines={body.count(chr(10)) + 1} '
          f'headings={heads}')


if __name__ == '__main__':
    main()
