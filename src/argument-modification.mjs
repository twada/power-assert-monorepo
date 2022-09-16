import { createNewRecorder, createNewAssertionMessage, NodeCreator } from './create-node.mjs';
import { toBeCaptured } from './rules/to-be-captured.mjs';

export class ArgumentModification {
  constructor ({ options, assertionPath, calleeNode, argMatchResult, metadataIdent }) {
    this.options = options;
    this.assertionPath = assertionPath;
    this.calleeNode = calleeNode;
    this.currentArgumentMatchResult = argMatchResult;
    this.metadataIdent = metadataIdent;
    this.argumentModified = false;
    this.messageUpdated = false;
  }

  enter (controller) {
    // create recorder per argument
    this.argumentRecorderIdent = createNewRecorder(Object.assign({
      controller,
      calleeNode: this.calleeNode,
      matchIndex: this.currentArgumentMatchResult.index,
      metadataIdent: this.metadataIdent
    }, this.options));
    // entering target argument
    this.currentArgumentPath = [].concat(controller.path());
  }

  leave (controller) {
    const currentNode = controller.current();
    const shouldCaptureValue = toBeCaptured(controller);
    const pathToBeCaptured = shouldCaptureValue ? controller.path() : null;
    const shouldCaptureArgument = this.isArgumentModified() || shouldCaptureValue;
    const resultNode = shouldCaptureArgument ? this.captureArgument(currentNode, pathToBeCaptured) : currentNode;
    if (this.currentArgumentMatchResult.name === 'message' && this.currentArgumentMatchResult.kind === 'optional') {
      this.messageUpdated = true;
      // enclose it in AssertionMessage
      return createNewAssertionMessage(Object.assign({
        controller,
        metadataIdent: this.metadataIdent,
        matchIndex: this.currentArgumentMatchResult.index,
        originalMessageNode: resultNode
      }, this.options));
    } else {
      return resultNode;
    }
  }

  isCapturing () {
    return true;
  }

  isMessageUpdated () {
    return !!this.messageUpdated;
  }

  isArgumentModified () {
    return !!this.argumentModified;
  }

  isLeaving (controller) {
    return isPathIdentical(this.currentArgumentPath, controller.path());
  }

  captureNode (controller) {
    return this.insertRecorder(controller.current(), controller.path(), '_tap');
  }

  captureArgument (currentNode, path) {
    return this.insertRecorder(currentNode, path, '_rec');
  }

  // internal

  insertRecorder (currentNode, path, methodName) {
    const receiver = this.argumentRecorderIdent;
    const types = new NodeCreator(currentNode);
    const args = [
      currentNode
    ];
    if (path) {
      const relativeEsPath = path.slice(this.assertionPath.length);
      args.push(types.valueToNode(relativeEsPath.join('/')));
    }
    const newNode = types.callExpression(
      types.memberExpression(receiver, types.identifier(methodName)),
      args
    );
    this.argumentModified = true;
    return newNode;
  }
}

export class NoModification {
  enter (controller) {
    this.currentArgumentPath = [].concat(controller.path());
  }

  isCapturing () {
    return false;
  }
}

const isPathIdentical = (path1, path2) => {
  return path1 && path2 && path1.join('/') === path2.join('/');
};
