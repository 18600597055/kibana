import { Request, ResponseObject, ResponseToolkit } from 'hapi-latest';
import { ObjectType, schema, TypeOf } from '../../config/schema';

import { KibanaRequest } from './request';
import { KibanaResponse, ResponseFactory, responseFactory } from './response';
import { RouteConfig, RouteMethod, RouteSchemas } from './route';

export interface RouterRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  handler: (
    req: Request,
    responseToolkit: ResponseToolkit
  ) => Promise<ResponseObject>;
}

export class Router {
  public routes: Array<Readonly<RouterRoute>> = [];

  constructor(readonly path: string) {}

  /**
   * Create the schemas for a route
   *
   * @returns Route schemas if `validate` is specified on the route, otherwise
   * undefined.
   */
  private routeSchemasFromRouteConfig<
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType
  >(route: RouteConfig<P, Q, B>, routeMethod: RouteMethod) {
    // The type doesn't allow `validate` to be undefined, but it can still
    // happen when it's used from JavaScript.
    if (route.validate === undefined) {
      throw new Error(
        `The [${routeMethod}] at [${
          route.path
        }] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation.`
      );
    }

    return route.validate ? route.validate(schema) : undefined;
  }

  /**
   * Register a `GET` request with the router
   */
  public get<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    route: RouteConfig<P, Q, B>,
    handler: RequestHandler<P, Q, B>
  ) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'GET');
    this.routes.push({
      method: 'GET',
      path: route.path,
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
    });
  }

  /**
   * Register a `POST` request with the router
   */
  public post<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    route: RouteConfig<P, Q, B>,
    handler: RequestHandler<P, Q, B>
  ) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'POST');
    this.routes.push({
      method: 'POST',
      path: route.path,
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
    });
  }

  /**
   * Register a `PUT` request with the router
   */
  public put<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
    route: RouteConfig<P, Q, B>,
    handler: RequestHandler<P, Q, B>
  ) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'POST');
    this.routes.push({
      method: 'PUT',
      path: route.path,
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
    });
  }

  /**
   * Register a `DELETE` request with the router
   */
  public delete<
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'DELETE');
    this.routes.push({
      method: 'DELETE',
      path: route.path,
      handler: async (req, responseToolkit) =>
        await this.handle(routeSchemas, req, responseToolkit, handler),
    });
  }

  /**
   * Returns all routes registered with the this router.
   * @returns List of registered routes.
   */
  public getRoutes() {
    return [...this.routes];
  }

  private async handle<
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType
  >(
    routeSchemas: RouteSchemas<P, Q, B> | undefined,
    request: Request,
    responseToolkit: ResponseToolkit,
    handler: RequestHandler<P, Q, B>
  ) {
    let kibanaRequest: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>;

    try {
      kibanaRequest = KibanaRequest.from(request, routeSchemas);
    } catch (e) {
      // TODO Handle failed validation
      return responseToolkit.response({ error: e.message }).code(400);
    }

    try {
      const kibanaResponse = await handler(kibanaRequest, responseFactory);

      let payload = null;
      if (kibanaResponse.payload instanceof Error) {
        // TODO Design an error format
        payload = { error: kibanaResponse.payload.message };
      } else if (kibanaResponse.payload !== undefined) {
        payload = kibanaResponse.payload;
      }

      return responseToolkit.response(payload).code(kibanaResponse.status);
    } catch (e) {
      // TODO Handle `KibanaResponseError`

      // Otherwise we default to something along the lines of
      return responseToolkit.response({ error: e.message }).code(500);
    }
  }
}

export type RequestHandler<
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType
> = (
  req: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>,
  createResponse: ResponseFactory
) => Promise<KibanaResponse<any>>;
