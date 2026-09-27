// @ts-nocheck
import { VisualState } from '@angisoft/ui';

const BlogErrorState = ({ onRetry }) => (
  <div className="blog-state" role="alert">
    <VisualState variant="error" onRetry={onRetry} />
  </div>
);

export default BlogErrorState;
