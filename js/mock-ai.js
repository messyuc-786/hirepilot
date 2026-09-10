/* ============================================================
   mock-ai.js — Deterministic offline stand-ins for every AI call.

   Purpose: let UI/UX work, navigation, layout, and regression
   testing happen without spending real Groq quota. Matched by a
   distinctive substring of each feature's system prompt (see
   features.js) so this file needs no changes when only wording
   around the prompts changes.

   Toggle: CONFIG.AI_MODE = 'mock' | 'live' (config.js). A
   localStorage override (hirepilot_ai_mode) and ?aimode= query
   param exist purely for interactive dev convenience — see
   Config.aiMode() in config.js.

   Every shape here matches the exact JSON schema each feature's
   system prompt asks for. If a prompt's schema changes, update the
   matching entry below.
   ============================================================ */

const MockAI = {
  _rules: [
    {
      match: 'expert resume reviewer',
      respond: () => ({
        candidate_name: 'Jamie Rivera',
        experience_level: 'senior',
        years_experience: 6,
        skills: ['Python', 'Go', 'AWS', 'Kubernetes', 'System Design', 'Leadership'],
        certifications: ['AWS Certified Developer'],
        strength_score: 78,
        ats_score: 66,
        ats_issues: ['Uses a two-column layout that some ATS parsers misread'],
        grammar_issues: [],
        missing_keywords: ['Terraform', 'CI/CD'],
        strengths: ['Clear quantified impact', 'Relevant certifications'],
        improvements: ['Add a professional summary', 'Quantify the leadership scope further'],
      }),
    },
    {
      match: 'technical recruiter comparing',
      respond: () => ({
        match_percentage: 81,
        required_skills: ['Python', 'Distributed systems', 'AWS'],
        preferred_skills: ['Kubernetes', 'Go', 'Terraform'],
        experience_required: '5+ years',
        certifications_required: [],
        key_responsibilities: ['Lead architecture decisions', 'Mentor engineers', 'Own service reliability'],
        matched_skills: ['Python', 'AWS', 'Kubernetes'],
        missing_skills: ['Terraform'],
        verdict: 'Strong match — worth applying.',
        priority_fixes: ['Add Terraform experience if any exists', 'Quantify mentoring impact'],
      }),
    },
    {
      match: 'expert resume writer',
      respond: () => ({
        keywords_to_add: ['Distributed systems', 'Kubernetes'],
        improved_bullets: [{
          original: 'Led a team of engineers.',
          improved: 'Led a cross-functional engineering team delivering a service handling millions of requests per day.',
          why: 'Adds scope and a concrete, honest metric already implied by the resume.',
        }],
        quantify_opportunities: ['Quantify the mentoring impact with a retention or promotion stat, if one exists.'],
        skills_to_add: ['Terraform (only if actually used)'],
        reorder_advice: ['Move certifications above education.'],
        tailored_summary: 'Senior backend engineer with hands-on experience building distributed systems, known for cutting latency and leading small teams.',
      }),
    },
    {
      match: 'LinkedIn strategist',
      respond: () => ({
        visibility_score: 70,
        headline_suggestions: [
          'Senior Backend Engineer | Python, Go, AWS | Distributed Systems',
          'Backend Engineer building high-scale systems',
          'Staff-track Backend Engineer | Team Lead | AWS Certified',
        ],
        about_feedback: ['About section is too short for recruiter keyword search.'],
        about_rewrite: 'I build reliable, high-throughput backend systems and enjoy mentoring engineers along the way.',
        experience_feedback: ['Add a metric to your most recent role.'],
        keywords_to_add: ['Kubernetes', 'Distributed Systems'],
        skills_to_list: ['Go', 'Terraform'],
        quick_wins: ['Add a custom banner image', 'Pin a project post to your profile'],
      }),
    },
    {
      match: 'cover letters that sound',
      respond: () => ({
        letter: "Dear Hiring Manager,\n\nI've spent the last several years building distributed systems, and your posting's focus on reliability at scale is exactly the kind of problem I enjoy solving.\n\nIn my current role I led the team that cut API latency by a significant margin while scaling to handle millions of daily requests — the same order of challenge your team is tackling.\n\nI'd welcome the chance to talk about how that experience applies here.\n\nSincerely,\nJamie",
        opening_alternatives: [
          "Your posting's emphasis on distributed systems caught my attention immediately.",
          'A mutual colleague pointed me to this role, and the scope lines up closely with my background.',
        ],
        notes: ['Confirm the hiring manager\'s name before sending.', 'Adjust the mutual-colleague line if it doesn\'t apply.'],
      }),
    },
    {
      match: 'experienced interviewer conducting',
      respond: () => ({
        questions: [
          { question: 'Tell me about a scaling challenge you solved.', looking_for: 'Specific metrics and trade-offs.' },
          { question: 'How do you approach mentoring junior engineers?', looking_for: 'Concrete examples, not generalities.' },
          { question: 'Describe a time you disagreed with a technical decision.', looking_for: 'How the disagreement was resolved.' },
          { question: 'How would you design a system for high write throughput?', looking_for: 'System design depth and trade-off awareness.' },
          { question: 'What is your approach to an on-call incident?', looking_for: 'Process, communication, and composure.' },
        ],
      }),
    },
    {
      match: 'interview coach giving',
      respond: () => ({
        overall_score: 74,
        communication: 78,
        confidence: 68,
        relevance: 76,
        technical_depth: 72,
        star_usage: 63,
        strengths: ['Specific, concrete examples'],
        improvements: ['Use the STAR structure more consistently', 'Close answers with a clear result'],
        per_question: [{
          question: 'Tell me about a scaling challenge you solved.',
          score: 74,
          feedback: 'Good specificity on the problem; light on the measurable result.',
          better_answer: 'Frame the close with a concrete outcome metric, e.g. the latency or throughput improvement achieved.',
        }],
      }),
    },
    {
      match: 'career development advisor',
      respond: () => ({
        readiness_score: 69,
        readiness_verdict: 'Close — a few targeted gaps remain.',
        skills_have: ['Python', 'AWS', 'Leadership'],
        skills_needed: ['Terraform', 'Multi-region design'],
        certifications_missing: ['HashiCorp Terraform Associate'],
        roadmap: [{
          phase: 'Weeks 1-4',
          focus: 'Terraform fundamentals',
          actions: ['Complete the official Terraform tutorial', 'Rebuild one existing piece of infra as code'],
          resources: ['HashiCorp Learn (free)'],
        }],
        quick_wins: ['Add Terraform to your resume skills section once you\'ve practiced with it'],
        time_estimate: '6-8 weeks of focused study',
      }),
    },
    {
      match: 'recruiter who screens',
      respond: () => ({
        first_impression: 'Strong senior profile with clear, quantified impact.',
        interview_likelihood: 76,
        strengths_noticed: ['Quantified results', 'Relevant certifications'],
        weaknesses_noticed: ['No professional summary at the top'],
        red_flags: [],
        questions_they_would_ask: ['Tell me more about the architecture behind that scaling win.'],
        how_to_address: ['Add a 2-3 sentence summary at the top of the resume.'],
      }),
    },
  ],

  /* Look up the matching mock by a substring of the system prompt.
     Falls back to a generic empty-but-valid shape so an unmatched
     prompt still renders (via UI's existing empty/"—" fallbacks)
     instead of throwing. */
  respond(system) {
    const rule = this._rules.find(r => system.includes(r.match));
    return rule ? rule.respond() : {};
  },
};
