import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import { v4 } from "uuid";

const region = "eu-west-1";
const tableName = "ProductsTable";

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
