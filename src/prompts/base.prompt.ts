export abstract class BasePrompt<T> {
  abstract execute(): Promise<T>;
}
