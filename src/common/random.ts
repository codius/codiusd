export function choices<T> (population: T[], n = 1): T[] {
  const pop = population.slice()
  let len = pop.length
  if (n > len) {
    return pop
  }
  const result = new Array(n)
  while (n--) {
    let x = Math.floor(Math.random() * (len--))
    result[n] = pop[x];
    [pop[x], pop[len]] = [pop[len], pop[x]]
  }
  return result
}
