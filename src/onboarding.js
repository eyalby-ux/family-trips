// Beta 0.9.3 (C): new-user onboarding -- a genuinely first-time user gets two equally weighted starting paths instead of one generic button.
// Pure decisions only; the screen and the click wiring live in v5-app.js.
import {normalizeDateRange,sanitizeTripDates} from './operational-data.js';

// The two-path screen is for an account that has NEVER had a trip: no trip is open AND the account has no trips at all. (`empty()` is also what a returning
// user with trips sees if they tap a tab before opening one -- that keeps its old screen.)
export const showsOnboarding=({trip,myTripCount})=>!trip&&Number(myTripCount)===0;

// The quick form's answer -> what ensureTrip() is seeded with, and the one destination country. Dates that are not real calendar dates are dropped;
// an end before the start is pulled up to the start (the same rule the trip settings apply). A destination is the one required field.
export function onboardingTripFrom({country,startDate,endDate}){
  const name=String(country??'').replace(/\s+/g,' ').trim();
  if(!name)return {error:'missing_country'};
  const dates=sanitizeTripDates({startDate,endDate}),range=normalizeDateRange(dates.startDate,dates.endDate);
  return {country:name,seed:{name:`טיול ל${name}`,startDate:range.start,endDate:range.end}};
}
