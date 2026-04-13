import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { data: T; statusCode: number; message: string }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T; statusCode: number; message: string }> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => ({
        data,
        statusCode: response.statusCode,
        message: 'OK'
      }))
    );
  }
}
