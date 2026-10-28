const card = (x, y, placeholder, example, bgColor = '#FEF3C7', width = 270, height = 180) => ({
  x,
  y,
  width,
  height,
  bgColor,
  placeholder,
  example
})

export const BOARD_TEMPLATES = [
  { id: 'empty', name: 'Empty board', summary: 'Start with a blank canvas', items: [] },
  {
    id: 'weekly',
    name: 'Weekly plan',
    summary: 'Plan priorities for the week',
    items: [
      card(100, 100, 'MONDAY\nTop priorities\n\nNotes', 'MONDAY\n• Review priorities\n• Plan the week\n\nNotes', '#FEF3C7'),
      card(410, 100, 'TUESDAY\nTop priorities\n\nNotes', 'TUESDAY\n• Focus work\n• Check progress\n\nNotes', '#DBEAFE'),
      card(100, 310, 'WEDNESDAY\nTop priorities\n\nNotes', 'WEDNESDAY\n• Midweek review\n• Follow up\n\nNotes', '#D1FAE5'),
      card(410, 310, 'THURSDAY\nTop priorities\n\nNotes', 'THURSDAY\n• Finish key tasks\n• Prepare for Friday\n\nNotes', '#FED7D7'),
      card(100, 520, 'FRIDAY\nTop priorities\n\nNotes', 'FRIDAY\n• Wrap up the week\n• Celebrate progress\n\nNotes', '#E9D5FF'),
      card(410, 520, 'WEEKLY REFLECTION\nWins\nChallenges\nNext week', 'WEEKLY REFLECTION\nWins: Made steady progress\nChallenges: Protecting focus time\nNext week: Set clearer priorities', '#F3F4F6')
    ]
  },
  {
    id: 'project',
    name: 'Project kickoff',
    summary: 'Get a new project moving',
    items: [
      card(100, 100, 'PROJECT GOAL\nWhat does success look like?', 'PROJECT GOAL\nDeliver a clear, useful first release that solves the core user need.', '#DBEAFE'),
      card(410, 100, 'SCOPE\nIn scope\nOut of scope', 'SCOPE\nIn scope: Core user flow and feedback\nOut of scope: Nice-to-have features', '#D1FAE5'),
      card(100, 310, 'MILESTONES\nMilestone 1\nMilestone 2\nLaunch', 'MILESTONES\n1. Discovery and planning\n2. Build and review\n3. Launch and learn', '#FEF3C7'),
      card(410, 310, 'TEAM & RISKS\nOwners\nDependencies\nRisks', 'TEAM & RISKS\nOwners: Assign a lead for each area\nDependencies: Confirm access and approvals\nRisks: Track unknowns early', '#FED7D7')
    ]
  },
  {
    id: 'meeting',
    name: 'Meeting notes',
    summary: 'Capture discussion and decisions',
    items: [
      card(100, 100, 'MEETING DETAILS\nDate\nAttendees\nPurpose', 'MEETING DETAILS\nDate: Add date\nAttendees: Add names\nPurpose: Align on the next steps', '#DBEAFE'),
      card(410, 100, 'AGENDA\n1.\n2.\n3.', 'AGENDA\n1. Progress since last meeting\n2. Open questions\n3. Next steps', '#FEF3C7'),
      card(100, 310, 'NOTES\nKey discussion points', 'NOTES\nAdd the key discussion points and context here.', '#F3F4F6'),
      card(410, 310, 'DECISIONS & ACTIONS\nDecision\nOwner\nDue date', 'DECISIONS & ACTIONS\nDecision: Confirm the agreed approach\nOwner: Assign a name\nDue date: Add a date', '#D1FAE5')
    ]
  },
  {
    id: 'study',
    name: 'Study plan',
    summary: 'Organize topics and study sessions',
    items: [
      card(100, 100, 'LEARNING GOAL\nWhat do you want to learn?', 'LEARNING GOAL\nBuild a consistent study habit and understand the key concepts.', '#E9D5FF'),
      card(410, 100, 'TOPICS\nTopic 1\nTopic 2\nTopic 3', 'TOPICS\n• Foundations\n• Core concepts\n• Practice and review', '#DBEAFE'),
      card(100, 310, 'STUDY SESSIONS\nDay\nTopic\nDuration', 'STUDY SESSIONS\nMonday: Foundations — 30 min\nWednesday: Practice — 45 min\nFriday: Review — 30 min', '#FEF3C7'),
      card(410, 310, 'QUESTIONS & REVIEW\nQuestions\nWhat to revisit', 'QUESTIONS & REVIEW\nQuestions: Add anything unclear\nRevisit: Note topics that need more practice', '#D1FAE5')
    ]
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming',
    summary: 'Collect ideas and choose a direction',
    items: [
      card(100, 100, 'CHALLENGE\nWhat are we trying to solve?', 'CHALLENGE\nDescribe the challenge in one clear sentence.', '#DBEAFE'),
      card(410, 100, 'IDEAS\nAdd every idea — defer judgment', 'IDEAS\n• What if we made it simpler?\n• What could we test quickly?\n• What have we not tried?', '#FEF3C7'),
      card(100, 310, 'PROMISING IDEAS\nWhich ideas stand out?', 'PROMISING IDEAS\nMove the most promising ideas here.', '#E9D5FF'),
      card(410, 310, 'NEXT EXPERIMENT\nWhat can we test first?', 'NEXT EXPERIMENT\nChoose one small experiment, an owner, and a date.', '#D1FAE5')
    ]
  },
  {
    id: 'retrospective',
    name: 'Retrospective',
    summary: 'Reflect and agree on improvements',
    items: [
      card(100, 100, 'WHAT WENT WELL?', 'WHAT WENT WELL?\n• Share wins and positive outcomes', '#D1FAE5'),
      card(410, 100, 'WHAT WAS HARD?', 'WHAT WAS HARD?\n• Note blockers or frustrating moments', '#FED7D7'),
      card(100, 310, 'WHAT DID WE LEARN?', 'WHAT DID WE LEARN?\n• Capture useful lessons and surprises', '#DBEAFE'),
      card(410, 310, 'ACTIONS FOR NEXT TIME', 'ACTIONS FOR NEXT TIME\n• Choose a small improvement\n• Assign an owner', '#FEF3C7')
    ]
  }
]
