/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { api } from './_generated/api'
// Cast through unknown to avoid recursive type explosions when used in hooks
export const ApiUnsafe = api as unknown as Record<string, any>
