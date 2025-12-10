export const fetchExerciseImage = async (exerciseName) => {
  try {
    // Use the search endpoint which allows fuzzy matching and returns image paths
    const searchUrl = `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(
      exerciseName.trim()
    )}`;
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.suggestions && data.suggestions.length > 0) {
      // Find the first suggestion that has an image
      const matchWithImage = data.suggestions.find(
        (s) => s.data && s.data.image
      );

      if (matchWithImage) {
        // Wger returns relative paths, so prepend the domain
        return `https://wger.de${matchWithImage.data.image}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching exercise image:", error);
    return null;
  }
};
