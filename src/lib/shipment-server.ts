

import { promises as fs } from 'fs';
import path from 'path';
import type { Shipment } from './shipment-data';

// This file is intended to be used ONLY on the server side.
// It interacts directly with the filesystem to read/write shipment data.
// NOTE: This approach is deprecated in favor of client-side localStorage for this project.

const shipmentsFilePath = path.join(process.cwd(), 'src', 'lib', 'shipments.json');

async function ensureFileExists() {
    try {
        await fs.access(shipmentsFilePath);
    } catch (error) {
        // File doesn't exist, create it with an empty array
        await fs.writeFile(shipmentsFilePath, JSON.stringify([], null, 2), 'utf8');
    }
}

export async function getShipmentsForServer(): Promise<Shipment[]> {
    try {
        await ensureFileExists();
        const fileContent = await fs.readFile(shipmentsFilePath, 'utf8');
        return JSON.parse(fileContent) as Shipment[];
    } catch (error) {
        console.error("Failed to read shipments.json:", error);
        // Return an empty array or handle the error as appropriate
        return [];
    }
}

export async function saveShipmentsForServer(shipments: Shipment[]): Promise<void> {
    try {
        await ensureFileExists();
        const data = JSON.stringify(shipments, null, 2);
        await fs.writeFile(shipmentsFilePath, data, 'utf8');
    } catch (error) {
        console.error("Failed to write to shipments.json:", error);
        throw new Error("Could not save shipment data.");
    }
}
