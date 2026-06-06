#!/usr/bin/env python3
"""WixブログのMHTMLスナップショットから記事本文を抽出する。

MHTMLはWixダッシュボードのブログ編集ページを丸ごと保存したもので、
内部に記事プレビューのレンダリング結果(text/htmlパート)を含む。
そのパートの post-title / post-description コンテナだけをサブツリー抽出し、
サイトのナビ・カテゴリ・フッターを構造的に排除する。

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
# テキスト前に改行を入れて段落・見出し・リストの区切りを保つブロック要素。
BLOCK = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'tr',
         'blockquote', 'section', 'ul', 'ol'}
# 段落終端で改行を入れる要素。
CLOSE_BREAK = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li'}


class ContainerExtractor(HTMLParser):
    """data-hook=<hook> の要素サブツリーだけをテキスト化する。

    depthで対象要素の入れ子を追跡し、その要素が閉じたら捕捉を止める。
    script/style/noscriptの中身は捨てる。li は '- ' 前置でリストを保つ。
    """

    def __init__(self, hook):
        super().__init__(convert_charrefs=True)
        self.hook = hook
        self.depth = 0
        self.capturing = False
        self.skip = 0            # script/style/noscriptのネスト数
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if not self.capturing and dict(attrs).get('data-hook') == self.hook:
            self.capturing = True
            self.depth = 0
        if not self.capturing:
            return
        if tag not in VOID:
            self.depth += 1
        if tag in ('script', 'style', 'noscript'):
            self.skip += 1
        if tag == 'li':
            self.parts.append('\n- ')
        elif tag in BLOCK or tag == 'br':
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if not self.capturing:
            return
        if tag in ('script', 'style', 'noscript') and self.skip > 0:
            self.skip -= 1
        if tag in CLOSE_BREAK:
            self.parts.append('\n')
        if tag not in VOID:
            self.depth -= 1
            if self.depth <= 0:
                self.capturing = False

    def handle_data(self, data):
        if self.capturing and self.skip == 0 and data.strip():
            self.parts.append(data)

    def text(self):
        joined = ''.join(self.parts)
        lines = [ln.strip() for ln in joined.splitlines() if ln.strip()]
        # li内にネストしたブロック要素があるとマーカー'-'と本文が別行に割れる。
        # 孤立した'-'を直後の本文行に再結合してリスト項目を復元する。
        merged = []
        i = 0
        while i < len(lines):
            if lines[i] == '-' and i + 1 < len(lines):
                merged.append('- ' + lines[i + 1])
                i += 2
            else:
                merged.append(lines[i])
                i += 1
        body = '\n'.join(merged)
        # 3行以上の連続改行を段落区切り(空行1つ)に圧縮する。
        return re.sub(r'\n{3,}', '\n\n', body).strip()


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
        body = d.text()
        if len(body) > len(best_body):
            best_body = body
            t = ContainerExtractor('post-title')
            t.feed(html)
            best_title = t.text()
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
    print(f'OK title={title!r}')
    print(f'OK output={dst}')
    print(f'OK body_chars={len(body)} body_lines={body.count(chr(10)) + 1}')


if __name__ == '__main__':
    main()
