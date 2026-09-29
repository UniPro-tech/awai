export function orderStatementsForVoting<T extends { id: string }>(
  statements: T[],
  votedStatementIds: ReadonlySet<string>,
  random: () => number = Math.random,
): T[] {
  const shuffle = (items: T[]) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [items[index], items[target]] = [items[target]!, items[index]!];
    }
    return items;
  };

  const unvoted = statements.filter(({ id }) => !votedStatementIds.has(id));
  const voted = statements.filter(({ id }) => votedStatementIds.has(id));
  return [...shuffle(unvoted), ...shuffle(voted)];
}
