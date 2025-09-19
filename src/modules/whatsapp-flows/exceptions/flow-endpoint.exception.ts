/**
 * Exceção específica para endpoints do WhatsApp Flows
 * Baseada no exemplo oficial da Meta
 */
export class FlowEndpointException extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}