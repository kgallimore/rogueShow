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
	MinigameGuesses = "minigame_guesses",
	MinigameSubmissions = "minigame_submissions",
	Minigames = "minigames",
	ReesesProducts = "reesesProducts",
	ReesesVotes = "reesesVotes",
	RogueAgents = "rogueAgents",
	Shows = "shows",
	Tiers = "tiers",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
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
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export enum GameStateCurrentModeOptions {
	"tierlist" = "tierlist",
	"rogue" = "rogue",
	"interstitial" = "interstitial",
}
export type GameStateRecord = {
	created: IsoAutoDateString
	currentAgent?: RecordIdString
	currentMode?: GameStateCurrentModeOptions
	currentProductNum?: number
	currentShowId?: RecordIdString
	frictionEnabled?: boolean
	id: string
	interactionEnabled?: boolean
	rogueStage?: number
	updated: IsoAutoDateString
}

export type MinigameGuessesRecord = {
	created: IsoAutoDateString
	guess: string
	id: string
	isAccepted?: boolean
	judgeScore?: number
	minigameId: RecordIdString
	updated: IsoAutoDateString
	userId: RecordIdString
}

export type MinigameSubmissionsRecord = {
	content: string
	id: string
	minigameId: RecordIdString
	timestamp: IsoAutoDateString
	updated: IsoAutoDateString
	userId: RecordIdString
}

export enum MinigamesTypeOptions {
	"text" = "text",
	"image" = "image",
	"mixed" = "mixed",
}

export enum MinigamesStatusOptions {
	"setup" = "setup",
	"active" = "active",
	"judging" = "judging",
	"completed" = "completed",
}
export type MinigamesRecord = {
	created: IsoAutoDateString
	id: string
	quirkSpec: string
	round: number
	showId: RecordIdString
	status: MinigamesStatusOptions
	type: MinigamesTypeOptions
	updated: IsoAutoDateString
}

export type ReesesProductsRecord = {
	bucketKey?: string
	canonicalTier?: RecordIdString
	created: IsoAutoDateString
	description?: string
	id: string
	image: FileNameString[]
	imageGallery?: FileNameString[]
	name: string
	order: number
	tier?: RecordIdString
	updated: IsoAutoDateString
}

export type ReesesVotesRecord = {
	created: IsoAutoDateString
	id: string
	product?: RecordIdString
	tier?: RecordIdString
	updated: IsoAutoDateString
	user?: RecordIdString
}

export enum RogueAgentsTypeOptions {
	"text" = "text",
	"picture" = "picture",
}
export type RogueAgentsRecord = {
	created: IsoAutoDateString
	id: string
	name: string
	prompt: string
	type: RogueAgentsTypeOptions
	updated: IsoAutoDateString
}

export enum ShowsModeOptions {
	"tierlist" = "tierlist",
	"rogue" = "rogue",
	"interstitial" = "interstitial",
}
export type ShowsRecord<TeventsLog = unknown, Tsequence = unknown> = {
	created: IsoAutoDateString
	currentProductId?: RecordIdString
	eventsLog?: null | TeventsLog
	hostId: RecordIdString
	id: string
	isActive?: boolean
	mode: ShowsModeOptions
	rogueStage?: number
	sequence?: null | Tsequence
	updated: IsoAutoDateString
}

export type TiersRecord = {
	Rank: string
	created: IsoAutoDateString
	id: string
	updated: IsoAutoDateString
}

export enum UsersRoleOptions {
	"host" = "host",
	"audience" = "audience",
}
export type UsersRecord = {
	admin?: boolean
	avatar?: FileNameString
	created: IsoAutoDateString
	email?: string
	emailVisibility?: boolean
	id: string
	name: string
	password: string
	role: UsersRoleOptions
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type GameStateResponse<Texpand = unknown> = Required<GameStateRecord> & BaseSystemFields<Texpand>
export type MinigameGuessesResponse<Texpand = unknown> = Required<MinigameGuessesRecord> & BaseSystemFields<Texpand>
export type MinigameSubmissionsResponse<Texpand = unknown> = Required<MinigameSubmissionsRecord> & BaseSystemFields<Texpand>
export type MinigamesResponse<Texpand = unknown> = Required<MinigamesRecord> & BaseSystemFields<Texpand>
export type ReesesProductsResponse<Texpand = unknown> = Required<ReesesProductsRecord> & BaseSystemFields<Texpand>
export type ReesesVotesResponse<Texpand = unknown> = Required<ReesesVotesRecord> & BaseSystemFields<Texpand>
export type RogueAgentsResponse<Texpand = unknown> = Required<RogueAgentsRecord> & BaseSystemFields<Texpand>
export type ShowsResponse<TeventsLog = unknown, Tsequence = unknown, Texpand = unknown> = Required<ShowsRecord<TeventsLog, Tsequence>> & BaseSystemFields<Texpand>
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
	minigame_guesses: MinigameGuessesRecord
	minigame_submissions: MinigameSubmissionsRecord
	minigames: MinigamesRecord
	reesesProducts: ReesesProductsRecord
	reesesVotes: ReesesVotesRecord
	rogueAgents: RogueAgentsRecord
	shows: ShowsRecord
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
	minigame_guesses: MinigameGuessesResponse
	minigame_submissions: MinigameSubmissionsResponse
	minigames: MinigamesResponse
	reesesProducts: ReesesProductsResponse
	reesesVotes: ReesesVotesResponse
	rogueAgents: RogueAgentsResponse
	shows: ShowsResponse
	tiers: TiersResponse
	users: UsersResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
