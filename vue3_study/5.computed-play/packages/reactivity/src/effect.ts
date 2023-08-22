import { ComputedRefImpl } from './computed'

export function effect<T = any>(fn: () => T) {
	const _effect = new ReactiveEffect<T>(fn)
	_effect.run()
}

/**
 * targetMap 大致结构如下
 * {target: Map<{key: Set<Effect>}>}
 *  target | depsMap
 *  	obj  |   key  |  Dep
 * 						 k1   | effect1,effect2...
 * 						 k2   | effect3,effect4...
 */
const targetMap = new WeakMap<object, Map<any, Set<ReactiveEffect>>>()

export let activeEffect: ReactiveEffect | undefined

type EffectScheduler = (...args: any[]) => any
export class ReactiveEffect<T = any> {
	computed?: ComputedRefImpl<T>
	constructor(
		public fn: () => T,
		public scheduler: EffectScheduler | null = null
	) {
		// ts会自动添加以下两行代码
		// this.fn = fn
		// this.scheduler = scheduler
	}
	run() {
		activeEffect = this
		return this.fn()
	}
}

export function track(target: object, p: unknown) {
	let depsMap = targetMap.get(target)
	if (!depsMap) {
		targetMap.set(target, (depsMap = new Map()))
	}
	let dep = depsMap.get(p)
	if (!dep) {
		depsMap.set(p, (dep = new Set()))
	}
	dep.add(activeEffect!)
}

export function trigger(target: object, p: unknown) {
	const depsMap = targetMap.get(target)
	if (!depsMap) return
	const dep = depsMap.get(p)
	if (!dep) return
	triggerEffects(dep)
}

export function triggerEffects(effects: Set<ReactiveEffect>) {
	for (let effect of effects) {
		if (effect.computed) {
			effect.scheduler!()
		} else {
			effect.run()
		}
	}
}
