# Concerns About Rolling Out Tableau MCP Across an Organization (Mainly Around VizQL Data Service)

Published: 2026/06/21

Last updated: 2026/06/21

This article is about the concerns I've come to feel about rolling out Tableau MCP across an organization. They surfaced precisely because I've spent a fair amount of time working with Tableau MCP and AI agents.

I'm mostly writing with a Tableau Server environment in mind, the kind where several departments share one server. But I believe the concerns themselves apply to both Tableau Server and Tableau Cloud, regardless of the size of the environment.

My goal here is simple: to keep adoption from stalling because people start using Tableau MCP without understanding how it actually works.

As someone who wants to promote this technology, I hesitated to write about concerns in public. It feels a little like dampening enthusiasm for Tableau MCP. But I wanted to put into words, early, a point that I think everyone will eventually run into.

Some of this gets fairly technical, but I'd be glad if you stayed with me to the end.

---

## Background

This article focuses on the following features. I'll add explanations as I go, but first, here are the terms and what they mean.

- VizQL Data Service (VDS):
- A feature that queries a Published Data Source directly, without going through a workbook.
- Unlike authoring a workbook, it is available to Viewers too.
- On Tableau Server, it is turned on by a single server-wide setting.
- On Tableau Cloud, it is on by default and there is no way to turn it off.
- Tableau MCP:
- A pathway through which AI calls the Tableau APIs, including VDS.
- It has made it possible for even Viewers to work with Tableau data through natural language.
- My understanding is that, until now, the Tableau APIs were designed for developer users, with use from Python and the like in mind. Tableau MCP, by contrast, has put those APIs into everyone's hands.

Also, since I'm a Tableau Server user myself, I write mainly with Tableau Server in mind.

That said, the concerns I raise apply to Tableau Cloud as well. In fact, because VDS cannot be disabled on Tableau Cloud, depending on how your Tableau Cloud is run, these concerns may already be surfacing.

And in this article, I assume an environment that follows the "delegated" and "self-governing" models from [Tableau's governance models](https://help.tableau.com/current/blueprint/en-us/bp_governance_models.htm).

An environment that follows the "centralized" model can probably put these concerns to rest and roll out Tableau MCP more easily. I'd expect it to be easier to pin down what needs attention, and easier to drive the work under a server administrator's lead.

---

## An Important Premise: VizQL Data Service and Tableau MCP Changed Tableau's Human-Centered Model

For a long time, Tableau was a "human-centered" tool for working with data.

Creators and Explorers would build dashboards and visualizations in workbooks and deliver pre-aggregated, pre-filtered data to people, usually Viewers. That was the model.

Which columns to show, and how to filter, were basically controlled inside the workbook. And by filtering I mean not only filtering by dimensions and measures, but also control through user functions that change with the viewer's attributes.

(Example: an HR dashboard, where some columns are used for aggregation but never displayed, and the displayed data is filtered to the viewer's own department.)

Then, in 2025.1, a feature called [VizQL Data Service (VDS)](https://help.tableau.com/current/api/vizql-data-service/en-us/index.html) was released. Put simply, it queries the data source behind a dashboard directly, without going through the dashboard.

Until now, Tableau delivered curated data to people through workbooks. VDS skips that window. A program, or an AI using Tableau MCP, can send queries straight to the Published Data Source behind the workbook, specify the columns, aggregations, and filters it wants, and pull the data out.

---

Here I'd like to pause and look at what the familiar reassurance, "Viewers only look, so they're safe," actually rests on.

To begin with, even if a Viewer is explicitly granted download permission on a specific data source, they still cannot download it. That's because the site role sets a structural ceiling on what a user can do.

> Site roles determine the maximum capabilities a user can have in that site. (For example, a user with a site role of Viewer will never be able to download a data source even if that capability is explicitly granted to them on a specific data source.)

Source: [Permissions, Site Roles, and Licenses](https://help.tableau.com/current/server/en-us/permission_license_siterole.htm)

The practice of "Viewers get only the window of the workbook" rested on this guarantee. And yet VDS is *not* on that list of capabilities you can't use even when they're explicitly granted. VDS can be used by Viewers.

This lines up with the description on the configuration-value page.

For example, the [Tableau Server configuration-value page](https://help.tableau.com/current/server/en-us/cli_configuration-set_tsm.htm#featuresvizqldataservicepermission) says the following.

> Enables the permission check for data source permissions rule "API Access". ... all site roles (except unlicensed) can access the VizQL Data Service APIs.

Strictly speaking, to query a data source with VDS, in practice you need to set the "API Access" permission on that data source.

But structurally, in environments where VDS is enabled, the old model of "as long as you control what data is shown in the workbook, you're fine" has been broken since 2025.1.

Regardless of the filters or displayed fields in the workbook, there is a path by which Viewers, too, can see the pre-aggregation data.

(An example permission configuration that actually lets a Viewer use VDS.)

---

This is my own guess, based on the official product blogs from around when VDS was first introduced, but like the other Tableau APIs, I think VDS was developed strictly as a feature for engineers. At the time it was built, did anyone really anticipate a use case where a Viewer issues a PAT and goes straight to the VDS API to pull data for their own personal purposes?

- [VizQL Data Service from Tableau: Use Your Data, Your Way](https://www.tableau.com/blog/vizql-data-service-use-your-data-your-way) (2024/8/8)
- [VizQL Data Service: Extend Your Data Beyond Visualizations](https://www.tableau.com/blog/vizql-data-service-beyond-visualizations) (2025/3/19)

Also, as of February 2025, when 2025.1 was released, I recall that AI agents weren't nearly the topic they are now. MCP itself was introduced by Anthropic in November 2024, and it [only began to gain real traction around the start of 2025](https://en.wikipedia.org/wiki/Model_Context_Protocol) (AI IDEs like Cursor and Windsurf added support in January–February 2025, and OpenAI in March). For reference, Tableau MCP was released in June 2025.

As long as developer users worked with VDS while staying fully mindful of permission settings and the like, I don't think there was any problem at all.

I recall that 2024–2025 was also a hot period for the Headless BI discussion, and that a feature was being built, with developers and engineers in mind, that let you use Tableau data sources as-is in all sorts of ways. That, I think, was a wonderful thing.

But what about now?

Tableau MCP put VDS into everyone's hands. Viewers can use AI and Tableau MCP to do whatever they like with VDS.

---

## Is That Tableau Environment Ready to Use Tableau MCP?

Since "just control what data is shown in the workbook and you're fine" no longer holds, rolling out Tableau MCP means first getting your Tableau environment into a state where using VDS isn't a problem.

So what does an environment that's safe to roll out Tableau MCP on look like? Narrowing to VDS, I think these are the main points.

Set the "API Access" permission only on the data sources you're comfortable letting AI use through Tableau MCP and similar tools.
If such a data source contains columns you don't want to expose to AI or Viewers, split it into one data source that gets API Access and one that doesn't, and set permissions on each separately.
Move filters that were implemented in the workbook over to the data source.
Especially row-level filters that work off user information.
Take an inventory of the user groups you grant permissions to.
Pay particular attention to user groups granted Project Leader.
Because a Project Leader holds every permission, a Viewer who is also a Project Leader may unintentionally hold the "API Access" permission.

In short, my understanding is that this calls for stricter management and implementation of data sources, stricter permission management, and in some cases frequent user-group management.

Take the HR dashboard I mentioned at the start. Keeping data viewing and distribution through the dashboard as the baseline, but making the data behind it safe even if VDS is run against it, you might:

- Remove any columns that must not be displayed ahead of time, and also move things like row-level security over to the data source.
- Tighten the permission rules, and monitor so that the "API Access" permission isn't granted to all users.

Those are the kinds of measures you can imagine.

---

Yes. Technically, by setting the "API Access" permission appropriately and operating and implementing data sources correctly, you can achieve safe, secure use of VDS and Tableau MCP.

If you can absorb the migration effort and the management effort and operate with confidence, then of course there are parts you can handle: moving filters to the data source, taking inventory of which columns belong in a data source, setting permissions, and so on.

In the course of that work, you may need a mechanism that instantly detects and prevents human error, such as granting the "API Access" permission by mistake, or misconfiguring the members of a user group you grant permissions to.

For a different Tableau organization, on the other hand, strict operation may not be necessary. If usage stays within a small team, data and operations that don't require governance may be enough.

---

Apart from governance, there's the question of whether everyone even wants this change.

The concerns I've raised about rolling out Tableau MCP require a fairly deep understanding of Tableau's permission model and features. Yet Tableau spread by being low-code or no-code, mainly through the workbook layer of visualization, drawing many people in along the way.

We're now asking the very people who will use and spread Tableau MCP to acquire an understanding of permissions and data sources that is completely different from what they needed before.

And on Tableau Server, enabling VDS is a server-wide setting, so it reaches every user of that server. Yet whether they're ready to use Tableau MCP or VDS, and indeed whether there's any need to use it at all, surely varies by degree across the different organizations using Tableau within that environment.

Given all this, is it realistic and reasonable to roll out Tableau MCP unilaterally?

That's my single biggest question.

Tableau MCP is wonderful. But honestly, especially for medium-to-large Tableau Server customers, I suspect this is hard to pull off in practice, and slow even where it can be done. With no way to scope VDS below the whole server, you can't limit the rollout to the teams that are ready, so a migration this demanding lands on the ones that aren't.

---

## One Idea: It Would Be Nice to Enable VDS at the Site Level

Readiness to accept Tableau MCP surely varies by degree. Yet the control over enabling VDS, the core feature behind Tableau MCP, has only two extremes.

Turn it on for the whole server, or narrow it down asset by asset with permissions. What concerns me is the missing middle. There's no way to control VDS at the level of an organization or domain, that is, at the site level.

By contrast, plenty of Tableau features can be configured per site.

Tableau Prep Conductor, Tableau Catalog, Tableau AI, and more. For these features, the option of not using, or not allowing, a feature in sites or organizations that don't need it is already there.

[Reference: Site settings reference](https://help.tableau.com/current/server/en-us/sites_add.htm)

This idea isn't the best one, and I think the same kind of discussion applies not just to VDS but to other APIs too. Still, as one way to introduce some degree of control, I felt that if VDS could be enabled per site, rolling out Tableau MCP would be that much easier.

The point is that only the sites or organizations ready for Tableau MCP would reach a state where they can practice AI use, Tableau MCP included. Sites that don't want it could be kept in a state where VDS can't be used.

On Tableau Server, a setting that affects the entire server often requires a certain amount of user consensus. If Tableau is going to become an Agentic Analytics Platform, then to let the users who actually want to practice Agentic Analytics do so, I'd really like to see a feature that allows this kind of granularity.

---

### Aside: Tableau MCP Got a "Site Settings" Environment Variable, but It Doesn't Solve the Problem at Its Root

Incidentally, as of 2026.2, [Tableau MCP gained a "site settings" environment variable](https://tableau.github.io/tableau-mcp/docs/configuration/mcp-config/site-settings).

With this environment variable set, you can, for example, arrange things so that when you connect to a given site and use Tableau MCP, the MCP tool that queries a data source can't be used (by listing query-datasource in EXCLUDE_TOOLS, for instance).

But this doesn't solve my concern, for two reasons.

First, what it controls is the behavior of MCP, not the use of VDS itself. You can limit which tools are exposed and the cap on results, but as long as you have a PAT and permissions, the path of hitting the VDS API directly, without going through MCP, remains wide open.

Second, whether that setting is honored depends on an environment variable on the MCP process (ENABLE_MCP_SITE_SETTINGS).

Turn it off and, as the documentation states, "the MCP server neither fetches nor applies site-setting overrides." And in a setup where you stand MCP up locally over stdio, the person who holds that environment variable is the MCP user themselves.

Unless you do something like block API connections from local environments (and was that even possible in Tableau to begin with?), there remain cases where the administrator's site settings are ignored.

So a feature that looks like it might solve this concern did ship for Tableau MCP, but in practice, as I understand it, paths remain that Tableau MCP alone can't close.

---

## In Closing: I Want to Hear Tableau Users' Voices, and I Want You to Send Yours to Tableau

The point of this article is not "VDS is dangerous" or "Tableau MCP is dangerous."

Quite the opposite: precisely because I genuinely want to grow the world of Agentic Analytics that VDS and Tableau MCP open up, my intent was to avoid the accidents of a hasty rollout that would set adoption back.

When the only choice is enabling or disabling at the server level, an organization that holds even one domain that isn't ready tends to fall to the safe side and disable it entirely. And by exactly that much, I worry that adoption of Tableau MCP and the realization of Agentic Analytics will be delayed.

That's why I think site-level VDS enablement, for example, is one approach for turning this spectrum of readiness into a phased rollout.

If this concern resonates with you, please raise it once with your Tableau contact. I'd love to hear your voices and opinions, things like "I've been wondering about this too," through quote posts and the like.

I believe this is a wall many Tableau users are likely to hit when they actually roll out Tableau MCP across their organization. But I'd really like to hear what you think. Is this concern overblown? Might there be a different way to solve it?

If you have questions, please reach out on X or LinkedIn.

Thank you for staying with me to the end.
