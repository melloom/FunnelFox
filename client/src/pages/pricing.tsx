import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const params = search ? `?${search}` : "";
    setLocation(`/subscription${params}`, { replace: true });
  }, []);

  return null;
}
