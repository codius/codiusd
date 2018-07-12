import { Injector } from 'reduct';
export default class SelfTest {
    private config;
    constructor(deps: Injector);
    start(): void;
    run(): Promise<void>;
    checkStatus(response: any): boolean;
}
