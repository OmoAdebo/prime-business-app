import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Employees() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/payroll", { replace: true });
  }, [navigate]);
  return null;
}
