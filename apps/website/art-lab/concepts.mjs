export const CONCEPTS = [
  "cat", "flower", "couch", "observability", "future", "media", "science", "telescope", "snake",
  "fern", "line graph", "event stream", "downtime", "dreaming", "vaporwave", "love", "longing",
];

export const slug = (concept) => concept.toLowerCase().replace(/[^a-z0-9]+/g, "-");
