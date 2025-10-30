import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Profile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/profile');
        setProfile(res.data);
      } catch (err) {
        alert('Failed to fetch profile');
      }
    }
    fetchProfile();
  }, []);

  if (!profile) return <p>Loading...</p>;

  return (
    <div>
      <h2>Welcome, {profile.full_name}</h2>
      <p>Email: {profile.email}</p>
    </div>
  );
}
