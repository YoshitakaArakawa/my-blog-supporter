# Concerns About Rolling Out Tableau MCP Across an Organization (Mainly Regarding VizQL Data Service)

Published: 2026/06/21

Last updated: 2026/06/21

In this article, I want to write about the concerns I've come to feel — precisely because I've spent a fair amount of time working with Tableau MCP and AI agents — when rolling out Tableau MCP across an organization.

I'm mostly writing with a Tableau Server environment in mind, the kind where multiple departments coexist. But I believe the concerns themselves apply to both Tableau Server and Tableau Cloud, regardless of the scale of the environment.

The intent of this article is, above all, to prevent adoption from stalling because people use Tableau MCP without understanding how it works.

As someone who wants to promote it, writing about concerns in public feels a bit like throwing cold water on Tableau MCP, and I hesitated. But I wanted to put into words, ahead of time, a point that I think everyone will eventually notice.

There are some fairly technical parts as well, but I'd be glad if you'd stay with me to the end.

---

## Some Premises

This article mainly deals with the following features. I'll add supplementary explanations along the way, but first, please get a sense of these terms and their outlines.

- VizQL Data Service (VDS):
- A feature that queries a Published Data Source directly, without going through a workbook.
- Unlike authoring a workbook, it can also be used by Viewers.
- On Tableau Server, it is enabled server-wide as a single setting.
- On Tableau Cloud, it is enabled, and there is no way to turn it off.
- Tableau MCP:
- A path through which AI calls the various Tableau APIs, including VDS.
- It has made it possible for even Viewers to use Tableau data through natural language.
- My understanding is that the various Tableau APIs were, until now, designed with Python and similar use in mind, assuming developer users. Tableau MCP, by contrast, has achieved the democratization of the various Tableau APIs.

Also, since I am a Tableau Server user myself, I write this article mainly with Tableau Server in mind.

That said, the concerns I raise also apply to Tableau Cloud. In fact, because VDS cannot be disabled on Tableau Cloud, depending on how your Tableau Cloud is operated, these concerns may already be materializing.

And in this article, I assume an environment that adopts the "delegated" and "self-governing" models within [Tableau's governance models](https://help.tableau.com/current/blueprint/en-us/bp_governance_models.htm).

An environment that adopts the "centralized" model can probably dispel the concerns in this article and roll out Tableau MCP more easily. I'd expect it to be easier to narrow down what needs to be addressed, and easier to drive the work under the lead of a server administrator.

---

## An Important Premise: VizQL Data Service and Tableau MCP Changed Tableau's Human-Centered Worldview

For a long time, Tableau was a "human-centered" data-utilization tool.

Creators and Explorers would assemble dashboards and visualizations in workbooks, and deliver pre-aggregated, pre-filtered data to people (often Viewers). That was the worldview.

Which columns to show, and how to filter, were basically controlled on the workbook side. The filtering here includes not only filtering by dimensions and measures, but also control using user functions that changes according to the attributes of the viewer.

(Example: an HR-information dashboard — there are columns used for aggregation but not displayed, and the displayed data is filtered to the viewer's own department, and so on.)

Meanwhile, in 2025.1, a feature called [VizQL Data Service (VDS)](https://help.tableau.com/current/api/vizql-data-service/en-us/index.html) was released. Put simply, it is a feature for querying the data source behind a dashboard directly, without going through the dashboard.

Until now, Tableau delivered curated data to people through workbooks. VDS bypasses that window, and against the Published Data Source sitting behind the workbook, it lets a program — or an AI using Tableau MCP — throw queries directly, specifying the columns, aggregations, and filters it wants, and pull out the data.

---

Here I'd like to pause and confirm the true nature of the reassurance we've had so far: "Viewers only look, so they're safe."

To begin with, even if a Viewer is explicitly granted download permission on a specific data source, they cannot download that data source. This is because the site role structurally determines the upper bound of what a user can do.

> Site roles determine the maximum capabilities a user can have in that site. (For example, a user with a site role of Viewer will never be able to download a data source even if that capability is explicitly granted to them on a specific data source.)

Source: [Permissions, Site Roles, and Licenses](https://help.tableau.com/current/server/en-us/permission_license_siterole.htm)

The practice of "Viewers only get the window of the workbook" rested on this guarantee. And yet, VDS is not on that list of capabilities that cannot be used even when explicitly granted. VDS can be used by Viewer users.

This is consistent with the description on the configuration-value page.

For example, [Tableau Server's configuration-value page](https://help.tableau.com/current/server/en-us/cli_configuration-set_tsm.htm#featuresvizqldataservicepermission) contains the following description.

> Enables the permission check for data source permissions rule "API Access". ... all site roles (except unlicensed) can access the VizQL Data Service APIs.

Strictly speaking, to query a data source using VDS, in practice you need to set the "API Access" permission on that data source.

But structurally, the worldview of "as long as you control data display on the workbook side, you're fine" has, in environments where VDS is enabled, broken down since 2025.1.

Regardless of the filters or displayed fields on the workbook side, there is a path by which Viewer users can also see the pre-aggregation data.

(An example of a permission configuration that actually lets a Viewer user use VDS.)

---

This is my conjecture based on the official product blogs from around when VDS was first introduced, but just as with the various Tableau APIs, I think VDS was developed strictly as a feature for engineers. Did the development of this feature, at that point in time, really anticipate a use case where a Viewer issues a PAT and goes directly to the VDS API to fetch data for their own personal purposes...?

- [VizQL Data Service from Tableau: Use Your Data, Your Way](https://www.tableau.com/blog/vizql-data-service-use-your-data-your-way) (2024/8/8)
- [VizQL Data Service: Extend Your Data Beyond Visualizations](https://www.tableau.com/blog/vizql-data-service-beyond-visualizations) (2025/3/19)

Also, as of February 2025, when 2025.1 was released, I recall that the topic of AI agents hadn't taken off as much as it has now. MCP itself was introduced by Anthropic in November 2024, and it [only began to gain serious traction around the start of 2025](https://en.wikipedia.org/wiki/Model_Context_Protocol) (with AI IDEs such as Cursor and Windsurf adding support in January–February 2025, and OpenAI in March). Incidentally, Tableau MCP was released in June 2025.

As long as developer users used VDS while being fully mindful of permission settings and the like, I don't think there was any problem at all.

I recall that 2024–2025 was also a hot period for the Headless BI discussion, and that a feature was being developed — with developers and engineers in mind — that let you use Tableau data sources as-is in various ways. That, I think, was rather wonderful.

But what about now?

Tableau MCP democratized VDS. Viewer users can use AI and Tableau MCP to make use of VDS however they like.

---

## Is That Tableau Environment Ready to Use Tableau MCP?

Since the premise of "just control data display on the workbook side and you're fine" is no longer correct, when rolling out Tableau MCP you need to get your Tableau environment into a state where using VDS is not a problem.

So what does a state that seems safe for rolling out Tableau MCP look like? Narrowing to VDS, I think the following are the main points.

- Set the "API Access" permission only on the data sources you're okay with AI using via Tableau MCP and the like.
- If such a data source contains columns you don't want to show to AI or Viewers, split it into a data source that gets API Access and one that doesn't, and set permissions on each individually.
- Migrate the filters implemented on the workbook side over to the data-source side.
- Especially row-level filters that operate based on user information.
- Take an inventory of the user groups to which you grant permissions.
- Pay particular attention to user groups granted Project Leader.
- Because a Project Leader holds all permissions, a Viewer who is a Project Leader may unintentionally hold the "API Access" permission.

In short, my understanding is that this demands stricter management and implementation of data sources, permission management, and in some cases frequent user-group management.

In the case of the HR-information dashboard I mentioned at the start, while keeping data viewing and distribution via the dashboard as the basic premise, to make the data behind it safe even if VDS is used against it, you might:

- Exclude in advance any columns that must not be displayed, and migrate things like row-level security over to the data-source side as well.
- Make the permission rules strict, and monitor so that the "API Access" permission is not granted to all users.

These are the kinds of measures one can imagine.

---

That's right. Technically, by setting the "API Access" permission appropriately and by operating and implementing data sources correctly, you can achieve safe and secure use of VDS and Tableau MCP.

If you can stack up the migration effort and management effort and operate with confidence, then of course there are parts you can handle — migrating filters to the data source, taking inventory of which columns to include in a data source, setting permissions, and so on.

In the course of that work, you may need a mechanism that immediately detects and prevents human error, such as mistakenly granting the "API Access" permission, or misconfiguring members within a user group that you grant permissions to.

On the other hand, for a different Tableau user organization, strict operation may not be necessary. If usage is confined to a small team, data and operations that don't require governance may be enough.

---

Apart from governance, there's the question of whether everyone even wants this change.

The concerns I've raised about rolling out Tableau MCP require a fairly deep understanding of Tableau's permission model and features. However, Tableau has spread by being low-code or no-code, mainly using the workbook layer of visualization, drawing in many people along the way.

We are asking the layer of people who will use and spread Tableau MCP to acquire an understanding of permissions and data sources that is completely different from before.

Moreover, in the case of Tableau Server, enabling VDS is a server-wide setting, so it ripples out to all users of that Tableau Server. Yet whether they're ready to use Tableau MCP or VDS — and indeed whether there's even a need to use it at all — surely varies across the different user organizations using Tableau within that environment, in gradations.

Given these premises, is it realistic and reasonable to roll out Tableau MCP unilaterally?

This is my single biggest question.

Tableau MCP is wonderful, but especially for medium-to-large Tableau Server users, is it realistic to push Tableau MCP or Agentic Analytics due to a specification-level issue, and to push migration away from the existing worldview of "you just controlled data display on the workbook side and you were fine"?

And even if it can be achieved, won't it take time?

---

## As One Idea, It Would Be Nice to Have Site-Level Enablement

The readiness to accept Tableau MCP must come in gradations. Yet the control over enabling VDS — the core feature of Tableau MCP — has only two extremes.

Turn it on for the whole server, or narrow it down per asset with permissions. My concern is that there's no middle ground: no VDS control at the unit of an organization or domain — that is, at the site level.

On the other hand, there are many features in Tableau that can be configured at the site level.

Tableau Prep Conductor, Tableau Catalog, Tableau AI, and so on... for other features, the gradation of not using / not allowing the use of a feature in sites or organizations that don't need it is already realized.

[Reference: Site settings reference](https://help.tableau.com/current/server/en-us/sites_add.htm)

This idea isn't the best one, and I think the same kind of discussion could be had not just for VDS but for other APIs as well... but as one way to introduce gradation, if VDS could be enabled at the site level, I felt that rolling out Tableau MCP would still be easier.

This is so that only the sites or organizations that are ready for Tableau MCP can reach a state where they practice AI usage, including Tableau MCP. Sites that don't want it can be put in a state where VDS cannot be used.

On Tableau Server, making a setting that affects the entire server often requires a certain degree of user consensus. If Tableau is going to transform into an Agentic Analytics Platform, then in order to let the users who actually want to practice Agentic Analytics do so, I'd very much like to see a feature that permits this kind of gradation.

---

### Aside: Tableau MCP Got a "Site Settings" Environment Variable, but This Doesn't Fundamentally Solve the Problem

Incidentally, from 2026.2, [Tableau MCP gained a "site settings" environment variable](https://tableau.github.io/tableau-mcp/docs/configuration/mcp-config/site-settings).

When this environment variable is configured for Tableau MCP usage, you can, for example, set things up so that when you connect to a certain site and use Tableau MCP, the MCP tool that queries a data source cannot be used (by specifying query-datasource in EXCLUDE_TOOLS, and so on).

However, this does not solve my concern. There are two reasons.

First, what can be controlled here is the behavior of MCP, not the use of VDS itself. You can narrow the tools that are exposed and the limits on results, but as long as you have a PAT and permissions, the path of hitting the VDS API directly without going through MCP remains as-is.

Second, whether that setting is honored depends on the MCP process side's environment variable (ENABLE_MCP_SITE_SETTINGS), right?

If you turn this off, then as the documentation states, "the MCP server neither fetches nor applies site-setting overrides." And in a configuration where you stand up MCP locally over stdio, the one who holds that environment variable is the MCP user themselves.

Unless you do something like "block API connections from the local environment" (and was that even possible as a Tableau specification in the first place?), there remain cases where the administrator's site settings are ignored.

So while a feature that looks like it might solve this concern did come out for Tableau MCP, my understanding is that, in reality, paths remain that can't be solved by Tableau MCP alone.

---

## In Closing: I Want to Hear Tableau Users' Voices, and I Want You to Deliver Your Own Voices to Tableau

The point of this article is not "VDS is dangerous" or "Tableau MCP is dangerous."

Quite the opposite: precisely because I genuinely want to expand the world of Agentic Analytics that VDS and Tableau MCP open up, my intent was to avoid accidents from a hasty rollout that would delay adoption.

When the only choice is the binary of enabling/disabling at the server level, an organization that holds even a single domain that isn't ready tends to fall to the safe side — that is, "disable it entirely." And by exactly that much, I'm concerned that the adoption of Tableau MCP and the realization of Agentic Analytics will be delayed.

That's why, for example, site-level VDS enablement is, I think, one approach for turning this gradation into a phased rollout.

If you find yourself sympathizing with this concern, please bring it up once with your Tableau contact. I'd love to hear voices and opinions — such as "I'm wondering about this too" — through quote posts and the like.

I believe this is a wall that many Tableau users are likely to run into when they actually roll out Tableau MCP across their organization, but I'd really like to hear your opinions on whether this concern is unfounded, whether there might be a different approach to solving it, and so on.

If you have questions, please reach out via X or LinkedIn.

Thank you for staying with me to the end.
