import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await api.post('/register', { full_name: fullName, email, password });
      alert('Registered successfully!');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Register</button>
    </form>
  );
}
