// Airbnb's Superhost thresholds, adapted: a rating-based badge computed from fields the
// User model already has, no extra data collection required.
export function isTrustedHost(user: { avgRating: number; ratingCount: number }) {
  return user.avgRating >= 4.8 && user.ratingCount >= 10;
}
