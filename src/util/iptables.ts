import spawn from './spawn'

/* This utility helps compose and execute iptables commands.
 * You will likely have to be running as root for this to have an effect.
 *
 * It is implemented as a set of reducers that represent the various iptables
 * command flags. By calling them on each other a new iptables rule can be built.
 * You can use composition to create a rule and then hand it to the main
 * `iptables` function which will spawn the process. In addition, it returns
 * a promise that will resolve to the exit status of the command.
 *
 * example: block hosted email spam by inserting a rule to reject forwarding tcp
 *          packets to port 25
 *
 * `const returnCode = await iptables(block(tcp(onForward(toPort(25)()))))`
 *
 *    or, alternatively, you can use the `reduceRule` helper function and just
 *    reduce them together!
 *
 * ```const commands = [block, tcp, onForward, toPort(25)]
 * const returnCode = await iptables(reduceRule(commands))
 * ```
 */

export type Action = ('-A' | '-C' | '-D' | '-I' | '-R')
export type Protocol = ('tcp' | 'udp' | 'all')
export type Port = [number, Protocol]

// Rule to be given to `iptables()` to run command
export interface Rule {
  action?: Action,
  protocol?: Protocol,
  src?: string,
  dst?: string,
  dport?: string,
  sport?: string,
  in?: string,
  out?: string,
  chain?: string,
  target?: string,
}

// Rule Reducers
export type RuleReducer = (rule?: Rule) => Rule

export const allow: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, target: 'ACCEPT' })

export const reject: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, target: 'REJECT' })

export const append: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, action: '-A' })

export const check: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, action: '-C' })

export const insert: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, action: '-I' })

export const deleteRule: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, action: '-D' })

export const onInput: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, chain: 'INPUT' })

export const onForward: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, chain: 'FORWARD' })

export const onOutput: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, chain: 'OUTPUT' })

export const tcp: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, protocol: 'tcp' })

export const udp: RuleReducer = (rule = {} as Rule): Rule => ({ ...rule, protocol: 'udp' })

export const toPort = ([port, protocol]: Port): RuleReducer => (rule = {} as Rule): Rule => ({ ...rule, dport: port.toString(), protocol: protocol })

export const fromPort = ([port, protocol]: Port): RuleReducer => (rule = {} as Rule): Rule => ({ ...rule, sport: port.toString(), protocol: protocol })

export const toPortNumberRange = (startPort: number, endPort: number) => (rule = {} as Rule): Rule => ({ ...rule, dport: `${startPort}:${endPort}` })

export const fromPortNumberRange = (startPort: number, endPort: number) => (rule = {} as Rule): Rule => ({ ...rule, sport: `${startPort}:${endPort}` })

export const toInterface = (networkInterface: string): RuleReducer => (rule = {} as Rule): Rule => ({ ...rule, out: networkInterface })

export const fromInterface = (networkInterface: string): RuleReducer => (rule = {} as Rule): Rule => ({ ...rule, in: networkInterface })

export const block: RuleReducer = (rule = {} as Rule): Rule => insert(reject(rule))

// Helper function to reduce an array of RuleReducers into a concrete Rule object
export function reduceRule (ruleReducers: RuleReducer[], initial = {} as Rule) {
  const reducer = (rule: Rule, ruleReducer: RuleReducer) => ruleReducer(rule)
  return ruleReducers.reduce(reducer, initial)
}

// Main iptables method to write a rule
export default async function iptables (rule: (Rule | RuleReducer)) {
  if (typeof rule === 'function') {
    rule = rule()
  }

  const cmd = 'iptables'
  const args = iptablesArgs(rule)
  return spawn(cmd, args, { swallowStdErr: true })
}

// Idempotent method to check if a rule already exists before adding it
export async function iptablesIdempotent (rule: Rule) {
  const exitCode = await iptables(check(rule))
  if (exitCode !== 0) {
    await iptables(rule)
  }
}

// Build iptables command args from a Rule
function iptablesArgs (rule: Rule) {
  if (!rule.action) rule.action = '-A'
  if (!rule.chain) rule.chain = 'INPUT'

  let args = [rule.action, rule.chain]

  if (rule.protocol) args.push('-p', rule.protocol)
  if (rule.in) args.push('-i', rule.in)
  if (rule.out) args.push('-o', rule.out)
  if (rule.src) args.push('-s', rule.src)
  if (rule.dst) args.push('-d', rule.dst)
  if (rule.sport) args.push('--sport', rule.sport)
  if (rule.dport) args.push('--dport', rule.dport)
  if (rule.target) args.push('-j', rule.target)
  if (rule.target === 'REJECT' && !(rule.sport || rule.dport)) {
    args.push('--reject-with', 'icmp-host-prohibited')
  }

  return args
}
