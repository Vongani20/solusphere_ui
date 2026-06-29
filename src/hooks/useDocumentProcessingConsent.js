import { useCallback, useEffect, useState } from "react";
import api, { getApiError } from "../services/api";

export const AI_DOCUMENT_CONSENT_TYPE = "ai_document_processing";

export function hasSignedDocumentConsent(consents) {
  return Array.isArray(consents)
    ? consents.some((item) => item.consent_type === AI_DOCUMENT_CONSENT_TYPE && item.signed)
    : false;
}

export function useDocumentProcessingConsent() {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/consent");
      setConsents(res.data?.consents || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load consent status."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signConsent = async (signedName) => {
    setSigning(true);
    setError("");
    try {
      const res = await api.post("/consent", {
        consent_type: AI_DOCUMENT_CONSENT_TYPE,
        signed_name: signedName.trim(),
        accept: true,
      });
      setConsents(res.data?.consents || []);
      return true;
    } catch (err) {
      setError(getApiError(err, "Failed to record consent."));
      return false;
    } finally {
      setSigning(false);
    }
  };

  return {
    consents,
    loading,
    signing,
    error,
    hasConsent: hasSignedDocumentConsent(consents),
    refresh,
    signConsent,
  };
}
