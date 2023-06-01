import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { v4 } from "uuid";

const region = "eu-west-1";
const tableName = "ProductsTable";
const headers = {
  "Content-Type": "application/json",
};

const client = new DynamoDBClient({ region: region });
const docClient = DynamoDBDocumentClient.from(client);

export const createProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const reqBody = JSON.parse(event.body as string);
  const newProduct = {
    ...reqBody,
    productID: v4(),
  };

  const putCommand = new PutCommand({
    TableName: tableName,
    Item: newProduct,
  });

  await docClient.send(putCommand);

  return {
    statusCode: 201,
    body: JSON.stringify(newProduct),
  };
};

export const getProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  const getCommand = new GetCommand({
    TableName: tableName,
    Key: {
      productID: id,
    },
    ConsistentRead: true,
  });

  const result = await docClient.send(getCommand);

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Item doesn't exist" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
};

export const updateProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;
  const reqBody = JSON.parse(event.body as string);
  const reqBodyKeys = Object.keys(reqBody);
  const updateExp = `SET ${reqBodyKeys.map((key, idx) => `#key${idx} = :value${idx}`).join(", ")}`;
  const expAttribNames = reqBodyKeys.reduce(
    (acc, key, idx) => ({
      ...acc,
      [`#key${idx}`]: key,
    }),
    {},
  );
  const expAttribValues = reqBodyKeys.reduce(
    (acc, key, idx) => ({
      ...acc,
      [`:value${idx}`]: reqBody[key],
    }),
    {},
  );

  const updateCommand = new UpdateCommand({
    TableName: tableName,
    Key: { productID: id },
    UpdateExpression: updateExp,
    ExpressionAttributeNames: expAttribNames,
    ExpressionAttributeValues: expAttribValues,
    ReturnValues: "ALL_NEW",
  });

  const updatedProduct = await docClient.send(updateCommand);

  if (!updatedProduct) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Update failed" }),
    };
  }

  return {
    statusCode: 204,
    body: JSON.stringify(updatedProduct),
    headers,
  };
};

export const deleteProduct = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters?.id;

  const deleteCommand = new DeleteCommand({
    TableName: tableName,
    Key: {
      productID: id,
    },
  });

  const result = await docClient.send(deleteCommand);

  if (!result) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Id doesn't exist" }),
      headers,
    };
  }

  return {
    statusCode: 204,
    body: JSON.stringify("Item successfully deleted"),
    headers,
  };
};

export const listProducts = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const getProducts = new ScanCommand({
    TableName: tableName,
  });

  const results = await docClient.send(getProducts);

  if (!results.Items) {
    return { statusCode: 200, body: JSON.stringify({ error: "No items found" }), headers };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results),
    headers,
  };
};
