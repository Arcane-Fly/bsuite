---
kind: record
authority: none
owner: bsuite
---

# Operator brief — week-in-review estate audit (2026-09-03)

> **File:** `20260903-operator-week-in-review-audit-brief-v1.00F.md`
> **Status:** F (a closed record: the brief that produced an audit, preserved verbatim)
> **Source:** `docs/prompt.md` as the operator wrote it on 2026-09-03 (untracked in the working tree; it fails `check-doc-naming` and `check-doc-classification` by name, which is why this record exists)
> **Produced:** [`../audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md`](../audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md)
> **Handling:** refined through `prompt-enhancer`, locked through `operator-intent-lock` (qig-memory key `bsuite_objective_lock_20260903_week_audit`), executed by a PI session with eleven audit lanes and three red-team reviewers. Per precedent `precedent__bsuite__20260827__a_prompt_document_is_a_record_or_it_is_not_complete`, a prompt document is a record, never a live plan.

## The brief, verbatim

> Review all work done in the last week. all claude threads related to this project including its submodules. see the memory mcp records, the issues, the plans and docs that present essentially as plans. the same for docs that present as specs, and so on. My messages to claude and my continued frustrations. anything i havent asked you to check but i should be asking you to check. check that too. this is first an exploritive task, both auditing and then formulating the solutions.
> 
> your report should be saved here: /home/braden/Desktop/Dev/bsuite/docs/audits/* using the required naming conventions. use this skill /agent-skl-find to find all skills relevant to this task.
> 
> Your report should also include skills and mcp's and agents to pair with each solution. your general solutions should also be consistent with my general standard rules, precedents and directives and anything else of this nature.  /home/braden/.agents/* contains global skills and agents and their recommended pairings and these "should" be available to any and all cli/extension/edi coding agents like you currently being called from the claude code extension in vscode.
> 
> use /prompt-enhancer on this prompt, then use /operator-intent-lock, then act on the enhanced prompt.
> 
> generally you are to identify the common ways i want the project to be in its produciton state and then identify everything preventing that from happening, then report on what, who, how, why, when, at both cause, and solution.
> 
> nothing in your report should:
> 
> - regress the project if implmented,
> - make customisation features less powerful or intuitive for the user,
> - break any existing integrations or workflows for the user,
> - introduce new bugs or regressions in unrelated parts of the project.
> 
> Your report should provide a comprehensive overview of the current state of the project, including identified issues, their root causes, and recommended solutions. It should also highlight any deviations from the desired production state and suggest actionable steps to align the project with the intended standards.
> 
> Duplication and competing feautres should be identified and resolved to ensure a streamlined and efficient project structure. And the Most advanced features and best practices should be prioritized and integrated consistently throughout the project. All recommendations should be actionable, clearly documented, and aligned with the overall project goals and standards. And link all relevant existing docs and plans to provide context and support for the proposed solutions. and if the existing docs and plans are not best practice and the most cutting edge version of what can be implemented in September 2026 then your report should include the researched best practice solutions and recommendations to bring the project up to that standard.
> 
> Anything that can be done by code should be able to be done in the UI by the developer. Hisest possible UX and the solution is never to compromise on usability or accessibility for the sake of technical convenience. This never includes requiring the developer to use code in the UI when a fully functional and intuitive UI alternative exists. All UI interactions should be designed with the developer's efficiency and ease of use in mind, ensuring that the most common and critical tasks can be performed quickly and intuitively without unnecessary friction. airtable style reports, data tools, and other interactive UI components should be leveraged to provide a seamless and efficient user experience. react flow and associated libraries should be utilized to create interactive and visually intuitive representations of workflows and data relationships, further enhancing the developer's ability to manage and navigate complex project structures effectively.
> 
> Customization features should be designed to empower the developer, providing flexibility and control without compromising the overall user experience. They should be intuitive, easily accessible, and seamlessly integrated into the UI, allowing developers to tailor the project to their specific needs while maintaining consistency and adherence to best practices. And enterprise ad min users of the platform should have the equivelent capability scoped down to their administrative permissions, ensuring they can manage and customize the platform effectively within their designated scoped tenant and sub tenants but never impact the full platform at the level a developer could.
> 
> Always use appropriately briefed subagents using this skill: /agent-run-subagents
> there are other like skills like the fan out skill or cli sub agents that may also be appropriate to ensure coverage depending on the specific tasks and requirements of the project., you may use ollama cloud models for additional ollama run cli agents that provide powerful agents that do not impact your own usage limits, these can be run via the "ollama run claude *" command as needed, limit to using the glm-5.3, glm-5.3-flash, and kimi-k3 models since they are comparitive in capability to ~opus 5 from your family of models. Your general subagents should pull from the sonnet 5, opus 5, and haiku 4.5 models as appropriate for the tasks at hand. hermes agent cli with the grok 4.6 model is also another powerful alternitive. Always ensure that subagents are briefed with the necessary context and instructions to perform their tasks effectively and efficiently.
