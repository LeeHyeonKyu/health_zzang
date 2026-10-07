import { getUser, getProfile, getCrewMembers } from "@/lib/data";
import WorkoutForm from "./workout-form";

export default async function NewWorkoutPage() {
  const user = await getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const members = await getCrewMembers(profile.crew_id);
  const otherMembers = members.filter((m) => m.id !== user.id);

  return <WorkoutForm crewMembers={otherMembers} />;
}
