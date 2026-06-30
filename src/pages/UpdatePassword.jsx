import { Navigate } from "react-router-dom";

export default function UpdatePassword() {
  return <Navigate to="/profile?tab=security" replace />;
}
