// This file is auto-generated by @ts-sdk-gen/openapi-ts

export const OrderSchema = {
  properties: {
    complete: {
      type: 'boolean'
    },
    id: {
      example: 10,
      format: 'int64',
      type: 'integer'
    },
    petId: {
      example: 198772,
      format: 'int64',
      type: 'integer'
    },
    quantity: {
      example: 7,
      format: 'int32',
      type: 'integer'
    },
    shipDate: {
      format: 'date-time',
      type: 'string'
    },
    status: {
      description: 'Order Status',
      enum: ['placed', 'approved', 'delivered'],
      example: 'approved',
      type: 'string'
    }
  },
  type: 'object',
  'x-swagger-router-model': 'io.swagger.petstore.model.Order',
  xml: {
    name: 'order'
  }
} as const

export const CustomerSchema = {
  properties: {
    address: {
      items: {
        $ref: '#/components/schemas/Address'
      },
      type: 'array',
      xml: {
        name: 'addresses',
        wrapped: true
      }
    },
    id: {
      example: 100000,
      format: 'int64',
      type: 'integer'
    },
    username: {
      example: 'fehguy',
      type: 'string'
    }
  },
  type: 'object',
  xml: {
    name: 'customer'
  }
} as const

export const AddressSchema = {
  properties: {
    city: {
      example: 'Palo Alto',
      type: 'string'
    },
    state: {
      example: 'CA',
      type: 'string'
    },
    street: {
      example: '437 Lytton',
      type: 'string'
    },
    zip: {
      example: 94301,
      type: 'string'
    }
  },
  type: 'object',
  xml: {
    name: 'address'
  }
} as const

export const CategorySchema = {
  properties: {
    id: {
      example: 1,
      format: 'int64',
      type: 'integer'
    },
    name: {
      example: 'Dogs',
      type: 'string'
    }
  },
  type: 'object',
  'x-swagger-router-model': 'io.swagger.petstore.model.Category',
  xml: {
    name: 'category'
  }
} as const

export const UserSchema = {
  properties: {
    email: {
      example: 'john@email.com',
      type: 'string'
    },
    firstName: {
      example: 'John',
      type: 'string'
    },
    id: {
      example: 10,
      format: 'int64',
      type: 'integer'
    },
    lastName: {
      example: 'James',
      type: 'string'
    },
    password: {
      example: 12345,
      type: 'string'
    },
    phone: {
      example: 12345,
      type: 'string'
    },
    userStatus: {
      description: 'User Status',
      example: 1,
      format: 'int32',
      type: 'integer'
    },
    username: {
      example: 'theUser',
      type: 'string'
    }
  },
  type: 'object',
  'x-swagger-router-model': 'io.swagger.petstore.model.User',
  xml: {
    name: 'user'
  }
} as const

export const TagSchema = {
  properties: {
    id: {
      format: 'int64',
      type: 'integer'
    },
    name: {
      type: 'string'
    }
  },
  type: 'object',
  'x-swagger-router-model': 'io.swagger.petstore.model.Tag',
  xml: {
    name: 'tag'
  }
} as const

export const PetSchema = {
  properties: {
    category: {
      $ref: '#/components/schemas/Category'
    },
    id: {
      example: 10,
      format: 'int64',
      type: 'integer'
    },
    name: {
      example: 'doggie',
      type: 'string'
    },
    photoUrls: {
      items: {
        type: 'string',
        xml: {
          name: 'photoUrl'
        }
      },
      type: 'array',
      xml: {
        wrapped: true
      }
    },
    status: {
      description: 'pet status in the store',
      enum: ['available', 'pending', 'sold'],
      type: 'string'
    },
    tags: {
      items: {
        $ref: '#/components/schemas/Tag',
        xml: {
          name: 'tag'
        }
      },
      type: 'array',
      xml: {
        wrapped: true
      }
    }
  },
  required: ['name', 'photoUrls'],
  type: 'object',
  'x-swagger-router-model': 'io.swagger.petstore.model.Pet',
  xml: {
    name: 'pet'
  }
} as const

export const ApiResponseSchema = {
  properties: {
    code: {
      format: 'int32',
      type: 'integer'
    },
    message: {
      type: 'string'
    },
    type: {
      type: 'string'
    }
  },
  type: 'object',
  xml: {
    name: '##default'
  }
} as const
