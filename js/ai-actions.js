/* ============================================================
   ai-actions.js — The three AI calls shared between the standalone
   feature screens (Resume Analyzer, JD Analyzer, Resume Optimizer
   in features.js) and the PreHired guided journey (prehired.js).

   Each function is PURE with respect to the DOM and Storage: given
   text in, it returns the parsed AI result (via API.ask(), so it
   still honors Mock AI / Live AI / auth exactly as every other
   call in the app does) — no rendering, no saving. That's what
   makes it safe to call from two different UIs without duplicating
   the system prompt (the actual "AI logic") in two places: the
   feature screens call these and then render + Storage.add*; so
   does PreHired.

   Moving a prompt here is a pure extraction — the prompt text and
   the API.ask() call are unchanged from what previously lived
   inline in features.js's runResume/runJD/runOptimizer.
   ============================================================ */

const AIActions = {
  /* Same system prompt/call as Features.runResume(). */
  async analyzeResume(text) {
    const system = `You are an expert resume reviewer and ATS specialist.
Analyse the resume and respond with ONLY a JSON object in this exact shape:
{
  "candidate_name": "string or Unknown",
  "experience_level": "entry | mid | senior | executive",
  "years_experience": number,
  "skills": ["technical and soft skills found"],
  "certifications": ["certifications found, empty array if none"],
  "strength_score": number 0-100,
  "ats_score": number 0-100,
  "ats_issues": ["specific formatting problems that hurt ATS parsing"],
  "grammar_issues": ["specific grammar or spelling problems found"],
  "missing_keywords": ["important industry keywords absent from this resume"],
  "strengths": ["what genuinely works well"],
  "improvements": ["specific actionable fixes"]
}
Be specific and honest. Do not invent qualifications that are not present.`;

    return API.ask(system, text);
  },

  /* Same system prompt/call as Features.runJD(). */
  async matchResumeToJD(resumeText, jdText) {
    const system = `You are a technical recruiter comparing a resume against a job description.
Respond with ONLY a JSON object in this exact shape:
{
  "match_percentage": number 0-100,
  "required_skills": ["must-have skills from the JD"],
  "preferred_skills": ["nice-to-have skills from the JD"],
  "experience_required": "string, e.g. 5+ years",
  "certifications_required": ["certifications the JD asks for"],
  "key_responsibilities": ["main duties of the role"],
  "matched_skills": ["skills the candidate HAS that the JD wants"],
  "missing_skills": ["skills the JD wants that the candidate LACKS"],
  "verdict": "one honest sentence on whether this is worth applying to",
  "priority_fixes": ["the 3 highest-impact changes to improve this match"]
}
Base matched_skills strictly on the resume. Never assume unstated skills.`;

    return API.ask(system, `RESUME:\n${resumeText}\n\n---\n\nJOB DESCRIPTION:\n${jdText}`);
  },

  /* Same system prompt/call as Features.runOptimizer(). */
  async optimizeResume(resumeText, jdText) {
    const system = `You are an expert resume writer.

ABSOLUTE RULE: never fabricate. Do not add skills, jobs, certifications,
metrics, or achievements that are not already present in the resume. If a
bullet lacks a number, suggest where the candidate could add one — do NOT
invent the number yourself. Use a placeholder like [X%] instead.

Respond with ONLY a JSON object in this exact shape:
{
  "keywords_to_add": ["JD keywords the candidate can honestly claim, because the resume already shows the underlying experience"],
  "improved_bullets": [
    {
      "original": "the exact bullet from the resume",
      "improved": "the rewritten version",
      "why": "what changed and why it is stronger"
    }
  ],
  "quantify_opportunities": ["bullets that would be stronger with a metric, and what to measure"],
  "skills_to_add": ["skills the candidate plausibly has based on the resume but has not listed"],
  "reorder_advice": ["structural changes, e.g. which section to move up"],
  "tailored_summary": "a 2-3 sentence professional summary targeted at this role, drawn only from real resume content"
}`;

    return API.ask(system, `RESUME:\n${resumeText}\n\n---\n\nTARGET JOB:\n${jdText}`);
  },

  /* Folds an optimizeResume() result into a revised resume TEXT —
     used to re-evaluate the optimized CV against the same JD with
     the existing matchResumeToJD() call. Never invents anything: it
     only appends fields the optimizer itself returned (which its own
     system prompt above already constrains to what the original
     resume actually supports), layered after the untouched original
     text rather than attempting a risky in-place bullet rewrite. */
  buildOptimizedResumeText(originalText, optimizeResult) {
    const bullets = Array.isArray(optimizeResult?.improved_bullets) ? optimizeResult.improved_bullets : [];
    const skills = Array.isArray(optimizeResult?.skills_to_add) ? optimizeResult.skills_to_add : [];
    const parts = [originalText.trim(), '\n\n--- OPTIMIZED FOR THIS ROLE ---'];
    if (optimizeResult?.tailored_summary) parts.push(optimizeResult.tailored_summary);
    if (bullets.length) parts.push(bullets.map(b => `- ${b.improved || b.original || ''}`).join('\n'));
    if (skills.length) parts.push(`Additional relevant skills: ${skills.join(', ')}`);
    return parts.join('\n\n');
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIActions };
}
