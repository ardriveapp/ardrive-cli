import { ClientService } from 'ardrive-daemon';

const instance: ClientService = new ClientService();
instance.clientConnect();

export const clientInstance: ClientService = instance;
