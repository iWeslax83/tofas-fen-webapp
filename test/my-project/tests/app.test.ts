import { IndexController } from '../src/controllers/index';
import { Service } from '../src/services/index';

describe('IndexController', () => {
    let controller: IndexController;
    let service: Service;

    beforeEach(() => {
        service = new Service();
        controller = new IndexController(service);
    });

    test('should return index page on getIndex', () => {
        const req = {}; // Mock request object
        const res = {
            send: jest.fn(),
        }; // Mock response object

        controller.getIndex(req, res);

        expect(res.send).toHaveBeenCalledWith('Index Page');
    });

    test('should handle postIndex correctly', () => {
        const req = { body: { data: 'test' } }; // Mock request object
        const res = {
            send: jest.fn(),
        }; // Mock response object

        controller.postIndex(req, res);

        expect(res.send).toHaveBeenCalledWith('Data received: test');
    });
});

describe('Service', () => {
    let service: Service;

    beforeEach(() => {
        service = new Service();
    });

    test('should fetch data correctly', async () => {
        const data = await service.fetchData();
        expect(data).toEqual(expect.any(Array)); // Assuming fetchData returns an array
    });

    test('should save data correctly', async () => {
        const result = await service.saveData('test data');
        expect(result).toBe(true); // Assuming saveData returns a boolean
    });
});