export async function fetchQueryData<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "Unable to refresh this data.";

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
