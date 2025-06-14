// This file is auto-generated by @ts-sdk-gen/openapi-ts

export type Foo = ({
    type?: 'Bar';
} & Bar) | ({
    type?: 'Baz';
} & Baz);

export type Baz = Qux;

export type Bar = Qux;

export type Qux = {
    id: string;
    type: Quux;
};

export type Quux = 'Bar' | 'Baz';

export type Quuz = ({
    type?: 'bar';
} & Bar) | ({
    type?: 'baz';
} & Baz);