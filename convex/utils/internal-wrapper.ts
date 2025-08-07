// @ts-nocheck
import { internal } from '../_generated/api'

export const InternalUnsafe = internal as any

export type Ctx = {
  runQuery: (fn: any, args: any) => Promise<any>
  runMutation: (fn: any, args: any) => Promise<any>
  runAction: (fn: any, args: any) => Promise<any>
}

export const runQueryUnsafe = (ctx: Ctx, fnPath: any, args: any) =>
  ctx.runQuery(fnPath, args)

export const runMutationUnsafe = (ctx: Ctx, fnPath: any, args: any) =>
  ctx.runMutation(fnPath, args)

export const runActionUnsafe = (ctx: Ctx, fnPath: any, args: any) =>
  ctx.runAction(fnPath, args)
