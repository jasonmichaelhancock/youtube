import * as ts from 'typescript';
export declare function hasPropDecoratedWithName(classNode: ts.ClassDeclaration, decoratorName: string): boolean;
export declare function propDecoratedWithName(node: ts.ClassDeclaration, decoratorName: string): Array<ts.PropertyDeclaration | null>;
export declare function hasDecoratorNamed(decoratedNode: ts.PropertyDeclaration | ts.ClassDeclaration, name: string): boolean;
export declare function decoratorNamed(tsDecorator: ts.Decorator, name: string): boolean;
export declare function getDecoratorProperties(tsDecorator: ts.Decorator, index?: number): ts.ObjectLiteralExpression;
export declare function getExpressionFromLiteralObject<T extends ts.Expression>(tsLiteral: ts.ObjectLiteralExpression, key: string): T;
export declare function getExpressionFromDecorator<T extends ts.Expression>(tsDecorator: ts.Decorator, key: string, index?: number): T;
export declare function getDecoratorNamed(tsClassNode: ts.ClassDeclaration, name: string): ts.Decorator | undefined;
