export const mapWithConcurrency = async <TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  iteratee: (item: TInput, index: number) => Promise<TOutput>,
) => {
  if (items.length === 0) {
    return [] as TOutput[];
  }

  const normalizedConcurrency = Math.max(1, Math.floor(concurrency));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(normalizedConcurrency, items.length) }, () => worker()),
  );

  return results;
};
