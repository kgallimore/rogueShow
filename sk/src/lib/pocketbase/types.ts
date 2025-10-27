/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	GameState = "gameState",
	ReesesProducts = "reesesProducts",
	ReesesVotes = "reesesVotes",
	RogueAgents = "rogueAgents",
	Tiers = "tiers",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type GameStateRecord = {
	agent: number
	created?: IsoDateString
	currentProduct: RecordIdString
	id: string
	updated?: IsoDateString
}

export type ReesesProductsRecord = {
	created?: IsoDateString
	id: string
	image: string[]
	name: string
	tier?: RecordIdString
	updated?: IsoDateString
}

export type ReesesVotesRecord = {
	created?: IsoDateString
	id: string
	product?: RecordIdString
	tier?: RecordIdString
	updated?: IsoDateString
	user?: RecordIdString
}

export enum RogueAgentsTypeOptions {
	"text" = "text",
	"picture" = "picture",
}
export type RogueAgentsRecord = {
	created?: IsoDateString
	id: string
	name: string
	prompt: string
	type: RogueAgentsTypeOptions
	updated?: IsoDateString
}

export type TiersRecord = {
	Rank: string
	created?: IsoDateString
	id: string
	updated?: IsoDateString
}

export type UsersRecord = {
	avatar?: string
	created?: IsoDateString
	email?: string
	emailVisibility?: boolean
	id: string
	name: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type GameStateResponse<Texpand = unknown> = Required<GameStateRecord> & BaseSystemFields<Texpand>
export type ReesesProductsResponse<Texpand = unknown> = Required<ReesesProductsRecord> & BaseSystemFields<Texpand>
export type ReesesVotesResponse<Texpand = unknown> = Required<ReesesVotesRecord> & BaseSystemFields<Texpand>
export type RogueAgentsResponse<Texpand = unknown> = Required<RogueAgentsRecord> & BaseSystemFields<Texpand>
export type TiersResponse<Texpand = unknown> = Required<TiersRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	gameState: GameStateRecord
	reesesProducts: ReesesProductsRecord
	reesesVotes: ReesesVotesRecord
	rogueAgents: RogueAgentsRecord
	tiers: TiersRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	gameState: GameStateResponse
	reesesProducts: ReesesProductsResponse
	reesesVotes: ReesesVotesResponse
	rogueAgents: RogueAgentsResponse
	tiers: TiersResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'gameState'): RecordService<GameStateResponse>
	collection(idOrName: 'reesesProducts'): RecordService<ReesesProductsResponse>
	collection(idOrName: 'reesesVotes'): RecordService<ReesesVotesResponse>
	collection(idOrName: 'rogueAgents'): RecordService<RogueAgentsResponse>
	collection(idOrName: 'tiers'): RecordService<TiersResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
