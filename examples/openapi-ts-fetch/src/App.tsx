import './App.css';

import * as Form from '@radix-ui/react-form';
import { DownloadIcon, PlusIcon, ReloadIcon } from '@radix-ui/react-icons';
import {
  Avatar,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Section,
  Text,
  TextField,
} from '@radix-ui/themes';
import { createClient } from '@ts-sdk-gen/client-fetch';
import { useState } from 'react';

import { PetSchema } from './client/schemas.gen';
import { addPet, getPetById, updatePet } from './client/sdk.gen';
import type { Pet } from './client/types.gen';

const localClient = createClient({
  // set default base url for requests made by this client
  baseUrl: 'https://petstore3.swagger.io/api/v3',
  /**
   * Set default headers only for requests made by this client. This is to
   * demonstrate local clients and their configuration taking precedence over
   * internal service client.
   */
  headers: {
    Authorization: 'Bearer <token_from_local_client>',
  },
});

localClient.interceptors.request.use((request, options) => {
  // Middleware is great for adding authorization tokens to requests made to
  // protected paths. Headers are set randomly here to allow surfacing the
  // default headers, too.
  if (
    options.url === '/pet/{petId}' &&
    options.method === 'GET' &&
    Math.random() < 0.5
  ) {
    request.headers.set('Authorization', 'Bearer <token_from_interceptor>');
  }
  return request;
});

localClient.interceptors.error.use((error) => {
  console.log(error);
  return error;
});

function App() {
  const [pet, setPet] = useState<Pet>();
  const [isRequiredNameError, setIsRequiredNameError] = useState(false);

  const onAddPet = async (formData: FormData) => {
    // simple form field validation to demonstrate using schemas
    if (PetSchema.required.includes('name') && !formData.get('name')) {
      setIsRequiredNameError(true);
      return;
    }

    const { data, error } = await addPet({
      body: {
        category: {
          id: 0,
          name: formData.get('category') as string,
        },
        id: 0,
        name: formData.get('name') as string,
        photoUrls: ['string'],
        status: 'available',
        tags: [
          {
            id: 0,
            name: 'string',
          },
        ],
      },
    });
    if (error) {
      console.log(error);
      return;
    }
    setPet(data!);
    setIsRequiredNameError(false);
  };

  const onGetPetById = async () => {
    const { data, error } = await getPetById({
      client: localClient,
      path: {
        // random id 1-10
        petId: Math.floor(Math.random() * (10 - 1 + 1) + 1),
      },
    });
    if (error) {
      console.log(error);
      return;
    }
    setPet(data!);
  };

  const onUpdatePet = async () => {
    const { data, error } = await updatePet({
      body: {
        category: {
          id: 0,
          name: 'Cats',
        },
        id: 2,
        name: 'Updated Kitty',
        photoUrls: ['string'],
        status: 'available',
        tags: [
          {
            id: 0,
            name: 'string',
          },
        ],
      },
      // setting headers per request
      headers: {
        Authorization: 'Bearer <token_from_method>',
      },
    });
    if (error) {
      console.log(error);
      return;
    }
    setPet(data!);
  };

  return (
    <Box
      style={{ background: 'var(--gray-a2)', borderRadius: 'var(--radius-3)' }}
    >
      <Container size="1">
        <Section size="1" />
        <Flex align="center">
          <a className="shrink-0" href="https://heyapi.dev/" target="_blank">
            <img
              src="https://heyapi.dev/logo.png"
              className="h-16 w-16 transition duration-300 will-change-auto"
              alt="Hey API logo"
            />
          </a>
          <Heading>@ts-sdk-gen/openapi-ts 🤝 Fetch API</Heading>
        </Flex>
        <Section size="1" />
        <Flex direction="column" gapY="2">
          <Box maxWidth="240px">
            <Card>
              <Flex gap="3" align="center">
                <Avatar
                  size="3"
                  src={pet?.photoUrls[0]}
                  radius="full"
                  fallback={pet?.name.slice(0, 1) ?? 'N'}
                />
                <Box>
                  <Text as="div" size="2" weight="bold">
                    Name: {pet?.name ?? 'N/A'}
                  </Text>
                  <Text as="div" size="2" color="gray">
                    Category: {pet?.category?.name ?? 'N/A'}
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Box>
          <Button onClick={onGetPetById}>
            <DownloadIcon /> Get Random Pet
          </Button>
        </Flex>
        <Section size="1" />
        <Flex direction="column" gapY="2">
          <Form.Root
            className="w-[260px]"
            onSubmit={(event) => {
              event.preventDefault();
              onAddPet(new FormData(event.currentTarget));
            }}
          >
            <Form.Field className="grid mb-[10px]" name="email">
              <div className="flex items-baseline justify-between">
                <Form.Label className="text-[15px] font-medium leading-[35px] text-white">
                  Name
                </Form.Label>
                {isRequiredNameError && (
                  <Form.Message className="text-[13px] text-white opacity-[0.8]">
                    Please enter a name
                  </Form.Message>
                )}
              </div>
              <Form.Control asChild>
                <TextField.Root placeholder="Kitty" name="name" type="text" />
              </Form.Control>
            </Form.Field>
            <Form.Field className="grid mb-[10px]" name="question">
              <div className="flex items-baseline justify-between">
                <Form.Label className="text-[15px] font-medium leading-[35px] text-white">
                  Category
                </Form.Label>
                <Form.Message
                  className="text-[13px] text-white opacity-[0.8]"
                  match="valueMissing"
                >
                  Please enter a category
                </Form.Message>
              </div>
              <Form.Control asChild>
                <TextField.Root
                  placeholder="Cats"
                  name="category"
                  type="text"
                  required
                />
              </Form.Control>
            </Form.Field>
            <Flex gapX="2">
              <Form.Submit asChild>
                <Button type="submit">
                  <PlusIcon /> Add Pet
                </Button>
              </Form.Submit>
              <Button onClick={onUpdatePet} type="button">
                <ReloadIcon /> Update Pet
              </Button>
            </Flex>
          </Form.Root>
        </Flex>
        <Section size="1" />
      </Container>
    </Box>
  );
}

export default App;
