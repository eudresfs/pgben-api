import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {
    console.log('✅ AppService inicializado');
  }

  getHello(): string {
    return 'Hello World! PGBen funcionando!';
  }
}
