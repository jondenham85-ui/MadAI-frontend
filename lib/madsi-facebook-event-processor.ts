export type FacebookEventInput = { field: unknown; metadata?: Record<string, unknown> };
export type FacebookEventTriage = { category: string; priority: 'normal' | 'high'; next_step: 'owner_review' };

/** Deterministic, privacy-minimized routing. This does not call Meta or perform Page actions. */
export function classifyFacebookEvent(event: FacebookEventInput): FacebookEventTriage {
  const field = typeof event.field === 'string' ? event.field.toLowerCase() : '';
  const item = typeof event.metadata?.item === 'string' ? event.metadata.item.toLowerCase() : '';
  if (field === 'mention') return { category: 'page_mention', priority: 'high', next_step: 'owner_review' };
  if (field === 'ratings' || field === 'rating') return { category: 'page_review', priority: 'high', next_step: 'owner_review' };
  if (field === 'feed' && item === 'comment') return { category: 'comment_activity', priority: 'high', next_step: 'owner_review' };
  if (field === 'feed' && item === 'post') return { category: 'post_activity', priority: 'normal', next_step: 'owner_review' };
  if (field === 'conversations' || field === 'messages') return { category: 'messaging_activity', priority: 'high', next_step: 'owner_review' };
  if (field === 'feed') return { category: 'page_feed_activity', priority: 'normal', next_step: 'owner_review' };
  return { category: 'other_page_activity', priority: 'normal', next_step: 'owner_review' };
}
