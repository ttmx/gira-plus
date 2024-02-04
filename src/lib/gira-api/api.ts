import { dev } from '$app/environment';
import { accountInfo, currentTrip, stations, token, tripRating, type StationInfo } from '$lib/state';
import { CapacitorHttp, type HttpResponse } from '@capacitor/core';
import { get } from 'svelte/store';
import { Preferences } from '@capacitor/preferences';
import type { M, Q, ThrownError } from '.';
import type { Mutation, Query } from './api-types';
const RETRY_DELAY = 1000;
const RETRIES = 5;
let backoff = 0;

async function mutate<T extends(keyof Mutation)[]>(body:any): Promise<M<T>> {
	let res: HttpResponse = { status: 0, data: {}, headers: {}, url: '' };
	for (let tryNum = 0; tryNum < RETRIES; tryNum++) {
		res = await CapacitorHttp.post({
			url: 'https://apigira.emel.pt/graphql',
			headers: {
				'User-Agent': 'Gira/3.2.8 (Android 34)',
				'content-type': 'application/json',
				'authorization': `Bearer ${get(token)?.accessToken}`,
			},
			data: body,
		});
		if (res.status >= 200 && res.status < 300) {
			console.debug(body, res);
			backoff = RETRY_DELAY;
			return res.data.data as Promise<M<T>>;
		} else {
			console.debug('error in mutate', res);
		}
		await new Promise(resolve => setTimeout(resolve, backoff += 1000));
	}
	console.error('failed mutation with body', body, res);
	throw {
		errors: res.data.errors,
		status: res.status,
	} as ThrownError;
}

async function query<T extends(keyof Query)[]>(body:any): Promise<Q<T>> {
	let res: HttpResponse = { status: 0, data: {}, headers: {}, url: '' };
	for (let tryNum = 0; tryNum < RETRIES; tryNum++) {
		res = await CapacitorHttp.post({
			url: 'https://apigira.emel.pt/graphql',
			headers: {
				'User-Agent': 'Gira/3.2.8 (Android 34)',
				'content-type': 'application/json',
				'authorization': `Bearer ${get(token)?.accessToken}`,
			},
			data: body,
		});
		if (res.status >= 200 && res.status < 300) {
			console.debug(body, res);
			backoff = RETRY_DELAY;
			return res.data.data as Promise<Q<T>>;
		} else {
			console.debug('error in query', res);
		}
		await new Promise(resolve => setTimeout(resolve, backoff += 1000));
	}
	console.error('failed query with body', body, res);
	throw {
		errors: res.data.errors,
		status: res.status,
	} as ThrownError;
}

// async getStations(): Promise<Q<['getStations']>> {
// 	const req = query<['getStations']>({
// 		'operationName': 'getStations',
// 		'variables': {},
// 		'query': 'query getStations {getStations {code, description, latitude, longitude, name, bikes, docks, serialNumber, assetStatus }}',
// 	});
// 	return req;
// }

export function getStationInfo(stationId: string): Promise<Q<['getBikes', 'getDocks']>> {
	const req = query<['getBikes', 'getDocks']>({
		'variables': { input: stationId },
		'query': `query { 
				getBikes(input: "${stationId}") { battery, code, name, kms, serialNumber, type, parent }
				getDocks(input: "${stationId}") { ledStatus, lockStatus, serialNumber, code, name }
		}`,
	});
	return req;
}

// async getBikes(stationId: string): Promise<Q<['getBikes']>> {
// 	const req = query<['getBikes']>({
// 		'variables': { input: stationId },
// 		'query': `query ($input: String) { getBikes(input: $input) { type, kms, battery, serialNumber, assetType, assetStatus, assetCondition, parent, warehouse, zone, location, latitude, longitude, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version }}`,
// 	});
// 	return req;
// }

// async getDocks(stationId: string): Promise<Q<['getDocks']>> {
// 	const req = query<['getDocks']>({
// 		'variables': { input: stationId },
// 		'query': `query ($input: String) { getDocks(input: $input) { ledStatus, lockStatus, serialNumber, assetType, assetStatus, assetCondition, parent, warehouse, zone, location, latitude, longitude, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version }}`,
// 	});
// 	return req;
// }

export async function reserveBike(serialNumber: string) {
	if (dev && (await Preferences.get({ key: 'settings/mockUnlock' })).value === 'true') {
		console.debug('mock reserveBike');
		return { reserveBike: true };
	} else {
		const req = mutate<['reserveBike']>({
			'variables': { input: serialNumber },
			'query': `mutation ($input: String) { reserveBike(input: $input) }`,
		});
		return req;
	}
}

export async function cancelBikeReserve() {
	const req = mutate<['cancelBikeReserve']>({
		'variables': {},
		'query': `mutation { cancelBikeReserve }`,
	});
	return req;
}

export async function startTrip() {
	if (dev && (await Preferences.get({ key: 'settings/mockUnlock' })).value === 'true') {
		console.debug('mock startTrip');
		await new Promise(resolve => setTimeout(resolve, 2000));
		return { startTrip: true };
	} else {
		const req = mutate<['startTrip']>({
			'variables': {},
			'query': `mutation { startTrip }`,
		});
		return req;
	}
}
// // returns an int or float of the active trip cost
// async  get_active_trip_cost(){
//     response = await make_post_request("https://apigira.emel.pt/graphql", JSON.stringify({
//         "operationName": "activeTripCost",
//         "variables": {},
//         "query": "query activeTripCost {activeTripCost}"
//     }), user.accessToken)
//     return response.data.activeTripCost
// }

// async getActiveTripCost() {
// 	const req = function query<['activeTripCost']>({
// 		'variables': {},
// 		'query': `query { activeTripCost }`,
// 	});
// 	return req;
// }

// async getPointsAndBalance() {
// 	const req = function query<['client']>({
// 		'variables': {},
// 		'query': `query { client { balance, bonus } }`,
// 	});
// 	return req;
// }

// async updateAccountInfo() {
// 	getPointsAndBalance().then(this.ingestAccountInfo);
// }

// async getSubscriptions() {
// 	const req = function query<['activeUserSubscriptions']>({
// 		'variables': {},
// 		'query': `query { activeUserSubscriptions { expirationDate subscriptionStatus name type active } }`,
// 	});
// 	return req;
// }

// async updateSubscriptions() {
// 	getSubscriptions().then(this.function ingestSubscriptions);
// }

export async function getTrip(tripCode:string) {
	const req = query<['getTrip']>({
		'variables': { input: tripCode },
		'query': `query ($input: String) { getTrip(input: $input) { user, asset, startDate, endDate, startLocation, endLocation, distance, rating, photo, cost, startOccupation, endOccupation, totalBonus, client, costBonus, comment, compensationTime, endTripDock, tripStatus, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version } }`,
	});
	return req;
}

export async function getActiveTripInfo() {
	const req = query<['activeTrip']>({
		'variables': {},
		'query': `query { activeTrip { user, startDate, endDate, startLocation, endLocation, distance, rating, photo, cost, startOccupation, endOccupation, totalBonus, client, costBonus, comment, compensationTime, endTripDock, tripStatus, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version } }`,
	});
	return req;
}

export async function getTripHistory(pageNum:number, pageSize:number) {
	const req = query<['tripHistory']>({
		'variables': { input: { _pageNum: pageNum, _pageSize: pageSize } },
		'query': `query ($input: PageInput) { tripHistory(pageInput: $input) { code, startDate, endDate, rating, bikeName, startLocation, endLocation, bonus, usedPoints, cost, bikeType } }`,
	});
	return req;
}

export async function getUnratedTrips(pageNum:number, pageSize:number) {
	const req = query<['unratedTrips']>({
		'variables': { input: { _pageNum: pageNum, _pageSize: pageSize } },
		'query': `query ($input: PageInput) { unratedTrips(pageInput: $input) { code, startDate, endDate, rating, startLocation, endLocation, cost, costBonus, asset } }`,
	});
	return req;
}

export async function rateTrip(tripCode:string, tripRating:number, tripComment?:string, tripAttachment?:File) {
	if (tripComment === undefined) tripComment = '';
	const actualAttachment = tripAttachment === undefined ? null : tripAttachment;
	const req = mutate<['rateTrip']>({
		'variables': {
			in: {
				code: tripCode,
				rating: tripRating,
				description: tripComment,
				attachment: actualAttachment !== null ? {
					bytes: actualAttachment?.arrayBuffer() ?? null,
					fileName: `img_${tripCode}.png`,
					mimeType: 'image/png',
				} : null,
			},
		},
		'query': `mutation ($in: RateTrip_In) { rateTrip(in: $in) }`,
	});
	return req;
}

export async function tripPayWithNoPoints(tripCode: string) {
	const req = mutate<['tripPayWithNoPoints']>({
		'variables': { input: tripCode },
		'query': `mutation ($input: String) { tripPayWithNoPoints(input: $input) }`,
	});
	return req;
}

export async function tripPayWithPoints(tripCode:string) {
	const req = mutate<['tripPayWithPoints']>({
		'variables': { input: tripCode },
		'query': `mutation ($input: String) { tripPayWithPoints(input: $input) }`,
	});
	return req;
}

export async function fullOnetimeInfo(): Promise<Q<['getStations', 'client', 'activeUserSubscriptions', 'activeTrip', 'unratedTrips', 'tripHistory']>> {
	let megaQuery = `query {`;
	megaQuery += `getStations {code, description, latitude, longitude, name, bikes, docks, serialNumber, assetStatus } `;
	megaQuery += `client { balance, bonus } `;
	megaQuery += `activeUserSubscriptions { expirationDate subscriptionStatus name type active } `;
	megaQuery += `activeTrip { user, startDate, endDate, startLocation, endLocation, distance, rating, photo, cost, startOccupation, endOccupation, totalBonus, client, costBonus, comment, compensationTime, endTripDock, tripStatus, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version } `;
	megaQuery += `unratedTrips(pageInput: { _pageNum: 0, _pageSize: 1 }) { code, startDate, endDate, rating, startLocation, endLocation, cost, costBonus, asset } `;
	megaQuery += `tripHistory(pageInput: { _pageNum: 0, _pageSize: 1 }) { code, startDate, endDate, rating, bikeName, startLocation, endLocation, bonus, usedPoints, cost, bikeType } `;
	megaQuery += `}`;

	const req = await query<['getStations', 'client', 'activeUserSubscriptions', 'activeTrip', 'unratedTrips', 'tripHistory']>({
		'variables': {},
		'query': megaQuery,
	});
	return req;
}