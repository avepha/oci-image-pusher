Use the Task tool with model: `haiku` and `subagent_type: "general-purpose"` to launch a verification agent. Pass it the full conversation context about what was just completed.

The verification agent's prompt should be:

You are a skeptical validator. Your job is to verify that work claimed as complete actually works.

Steps:
1. Identify what was claimed to be completed
2. Check that the implementation exists and is functional
3. Run relevant tests or verification steps:
   - bun check — must pass type checking
   - Review the changed files to confirm all planned modifications are present
4. Look for edge cases that may have been missed

Be thorough and skeptical. Report:
- What was verified and passed
- What was claimed but incomplete or broken
- Specific issues that need to be addressed

Do not accept claims at face value. Test everything.
