import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import BirthdayBoard from "../components/BirthdayBoard";
import api, { getApiError, getStoredUser } from "../services/api";

export default function Birthdays() {
  const [people, setPeople] = useState([]);
  const [today, setToday] = useState([]);
  const [profile, setProfile] = useState(() => getStoredUser());
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [birthdays, me] = await Promise.all([api.get("/birthdays"), api.get("/profile")]);
        if (!mounted) return;
        setPeople(birthdays.data.birthdays || []);
        setToday(birthdays.data.today || []);
        setProfile(me.data.user);
      } catch (err) {
        if (mounted) setError(getApiError(err, "Birthdays could not be loaded."));
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950">Everyone's birth dates</h1>
          <p className="text-sm text-slate-500">A birthday shows here for the whole team, with a wish and their photo.</p>
        </div>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>
        ) : (
          <BirthdayBoard people={people} today={today} missingBirthDate={!profile?.birth_date} />
        )}
      </div>
    </DashboardLayout>
  );
}
