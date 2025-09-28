function safeJSONParse(jsonString: string) {
  try {
    return JSON.parse(jsonString);
  } catch {
    // Try escaping quotes inside values
    const fixed = jsonString.replace(/: ?"([^"]*?)"([^"]*?)"([^"]*?)"/g, (m, p1, p2, p3) => {
      return `: "${p1}\\"${p2}\\"${p3}"`;
    });
    return JSON.parse(fixed);
  }
}
