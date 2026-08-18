function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueById(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    if (!value?.id || seen.has(value.id)) return false;
    seen.add(value.id);
    return true;
  });
}

export function normalizeProposalLifecycle(suggestions = [], rejectedSuggestions = []) {
  const active = [];
  const archived = [];

  for (const suggestion of suggestions) {
    if (suggestion?.status === 'rejected') archived.push(suggestion);
    else active.push(suggestion);
  }
  archived.push(...rejectedSuggestions.filter((suggestion) => suggestion?.status === 'rejected'));

  const activeIds = new Set(active.map((suggestion) => suggestion.id));
  return {
    suggestions: uniqueById(active),
    rejectedSuggestions: uniqueById(archived).filter((suggestion) => !activeIds.has(suggestion.id)),
  };
}

export function rejectProposal(suggestions = [], rejectedSuggestions = [], suggestionId, now = new Date()) {
  const suggestion = suggestions.find((candidate) => candidate.id === suggestionId);
  if (!suggestion) return normalizeProposalLifecycle(suggestions, rejectedSuggestions);

  const rejected = {
    ...clone(suggestion),
    status: 'rejected',
    rejectedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return normalizeProposalLifecycle(
    suggestions.filter((candidate) => candidate.id !== suggestionId),
    [...rejectedSuggestions.filter((candidate) => candidate.id !== suggestionId), rejected],
  );
}
