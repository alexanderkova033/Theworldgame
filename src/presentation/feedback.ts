// Where players send their thoughts. Set VITE_FEEDBACK_URL (a form's link) in
// the host's environment settings; while it's empty, no link is shown.
export const FEEDBACK_URL: string = import.meta.env.VITE_FEEDBACK_URL ?? "";
