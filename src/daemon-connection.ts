import { ClientService } from 'ardrive-daemon';

const instance = new ClientService();
instance.clientConnect();

export default instance;
