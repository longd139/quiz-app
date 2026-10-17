What is async/await in JavaScript?
A. It is a JavaScript feature that makes asynchronous code look and behave like synchronous code.
B. Itis used to send data to a server without blocking the UI.
C. Itis a way to handle callback functions.
D. Itis amethod to manage state in React components.
Đáp án: A
Giải thích: Cú pháp async/await hoạt động như một lớp bọc cú pháp (syntactic sugar) cao cấp bên trên Promise, cho phép lập trình viên tổ chức viết mã xử lý bat đồng bộ theo phong cách tuân tự phẳng, dễ đọc như mã đồng bộ.

What is the main feature of Tailwind CSS compared to other CSS frameworks?
A. It provides pre-designed UI components and themes
B. It uses a utility-first approach, allowing developers to build custom designs using small utility classes
C. It provides pre-built JavaScript components
D. Itis a framework specifically for mobile development
Đáp án: B
Giải thích: Tailwind CSS nổi bật hoàn toàn nhờ triết lý thiết kế hướng tiện ích (utility-first), cung cp hệ thống các lớp CSS nguyên tử đơn nhiệm để chắp vá giao diện linh hoạt, giúp tối ưu hóa khả năng tùy biến thiết kế.

Which React Router component is commonly used to perform client-side navigation without triggering a full page reload?
A. <Router>
B. <Routes>
C. <Link>
D. <Route>
Đáp án: C
Giải thích: Component <Link> được dùng dé thay thé thẻ <a> thuần trong ứng dung Single Page Application (SPA), giúp chặn hành vi tải lại toàn trang của trình duyệt và thực hiện chuyển hướng cục bộ ngay tại client.

Next.js is primarily used for:
A. Styling static websites
B. Creating server-rendered or statically generated React applications
C. Managing back-end databases
D. Handling real-time communication
Đáp án: B
Giải thích: Meta-framework Nextjs phát triển các giải pháp kiến trúc nâng cao chạy trên nền tảng React với mục tiêu hàng dau là hỗ trợ các công nghệ kết xuất phía máy chủ (SSR) và biên dịch trang tĩnh trước (SSG).

What is JSX in React primarily used for?
A. Defining server-side logic and database queries
B. Describing the user interface structure and embedding HTML-like markup directly within JavaScript code.
C. Managing application-wide state using a global store
D. Optimizing image loading and asset management
Đáp án: B
Giải thích: Bản chất tối cao của ngôn ngữ JSX là cung cắp phương thức mô tả trực quan cầu trúc giao diện (UI layout) bằng cách cho phép nhúng trực tiếp các thẻ khai báo dạng mô phỏng HTML vào trong dòng mã logic JavaScript.

What happens if you forget to add key to items in a list rendered with map()?
A. React will not render the list at all.
B. React will display a warning in the console about missing keys.
C. React will automatically assign keys to each item.
D. React will throw an error and stop rendering the component.
Đáp án: B
Giải thích: Khi thiếu khóa phân định key độc nhất cho các phan tử duyệt mảng, công cụ Virtual DOM của React vẫn sẽ kết xuất giao diện bình thường nhưng sẽ in một dòng cảnh báo (warning) lên cửa sổ console của trình duyệt để nhắc nhở tối ưu.

Which of the following statements about reducers in Redux is true?
A. Reducers can only be used with React class components, not functional components.
B. Reducers are responsible for dispatching actions.
C. Reducers should have side effects such as API calls or database interactions.
D. Reducers must be pure functions with no side effects.
Đáp án: D
Giải thích: Theo quy chuẩn thiết kế Redux, các hàm reducer bắt buộc phải tuân thủ nghiêm ngặt nguyên ly hàm thuần khiết (pure functions): chỉ nhận trạng thái cũ cùng hành động để tính toán trạng thái mới mà không sinh ra tác vụ phụ.

What is Redux Thunk used for?
A. To manage asynchronous actions in Redux.
B. To log every action dispatched to the Redux store.
C. To split reducers into simpler functions.
D. To handle side effects in React components.
Đáp án: A
Giải thích: Middleware Redux Thunk cho phép các lập trình viên viết các hàm phát sinh hành động (action creators) trả về một hàm thực thi thay vì một đối tượng đơn thuần, giúp xử lý các logic bat đồng bộ (gọi API) một cách dễ dàng.

How can you define a lazy component in React?
A. Using the lazy function from the React library
B. Wrapping the component in the LazyComponent higher-order component
C. Importing the component with the lazy keyword
D. Using the createLazyComponent method from the React package
Đáp án: A
Giải thích: . Cú pháp quy chuẩn của React dé thực hiện thiết lập tải chậm (lazy loading) thành phan giao diện là sử dụng hàm khởi tạo lazy() do chính thư viện cốt lõi react cung cắp sẵn đi kèm cú pháp gọi import() động.

What would happen if you didn't include the class="form-control" in your element?
A. The input would not be submitted with the form
B. The input would fail client-side validation
C. The input field would revert to the browser's default styles
D. The input field would become non-responsive
Đáp án: C
Giải thích: Lớp tên form-control chịu trách nhiệm quy định phong cách hiển thị biểu mẫu chuẩn của hệ thống Bootstrap. Nếu loại bỏ nó, ô nhập liệu <input> sẽ ngay lập tức bị tước bỏ giao diện của Bootstrap và quay về định dạng thô của trình duyệt.

Which HTTP method is typically used in a fetch request to retrieve data from a server?
A. POST
B. GET
C. PUT
D. DELETE
Đáp án: B
Giải thích: Theo các nguyên tắc ràng buộc của kiến trúc RESTful chuẩn, phương thức HTTP mang tên GET là công cụ duy nhất mang ngữ nghĩa yêu cầu máy chủ tìm kiếm, truy xuất và phản hồi tệp thông tin dữ liệu về cho phía máy khách.

What is a Higher-Order Component (HOC) in React?
A. A component that has a higher visual hierarchy than others.
B. A function that takes a component as an argument and returns a new component with enhanced functionality
C. A component that only renders other components without any logic of its own
D. A built-in React component for advanced routing
Đáp án: B
Giải thích: Higher-Order Component (HOC) tuân thủ mô hình thiết kế nâng cao trong lập trình hàm: Nó đóng vai trò là một hàm nhận vào một component nền tảng ban đầu làm tham số và xuất bản ra một component mới đã được nâng cắp thêm các tang xử lý logic nâng cao.

How are PropTypes typically integrated into a functional React component?
A. By declaring them within the component's return statement
B. By installing react-proptypes and using this.props.propTypes inside the function
C. By defining a propTypes property on the component function itself, usually after its declaration, to specify prop type definitions
D. PropTypes cannot be used with functional components
Đáp án: C
Giải thích: Cách thức gắn bộ kiểm thử kiểu dữ liệu PropTypes vào cấu trúc Functional Component là khai báo gán trực tiếp thuộc tính mở rộng .propTypes lên chính đối tượng hàm của thành phần đó ngay sau khi định nghĩa xong khối hàm.

What is React?
A. A programming language
B. A JavaScript library for building user interfaces
C. Adatabase management system
D. Aweb browser
Đáp án: B
Giải thích: Căn cứ theo đúng định nghĩa ghi nhận tại trang tài liệu hướng dẫn chính thức từ Facebook, React là một thư viện mã nguồn mở viết trên ngôn ngữ JavaScript chuyên dụng cho tác vụ kiến tạo giao diện người dùng (UI).

Which two recent additions to React allow the complete integration of code splitting into applications?
A. useState() and useEffect()
B. React.memo() and useCallback()
C. lazyQ API and Suspense components
D. ReactDOM.createRoot() and BrowserRouter.
Đáp án: C
Giải thích: Việc tích hợp tính năng phân tách tệp mã nguồn đóng gói (code splitting) trong hệ sinh thái React được vận hành đồng bộ nhờ bộ đôi: hàm điều hướng tải thành phần động lazy() phối hợp cùng thẻ kiểm soát trang thái chờ <Suspense>.

What is the primary goal of decoupling route declarations in a React Router application?
A. To improve the organization and maintainability of the code by separating routes into larger, more manageable modules.
B. To enhance the security of the application by separating sensitive routes from public routes.
C. To enable the use of dynamic routing and nested routes in the application.
D. To enhance code organization and maintainability by separating routes into smaller, more manageable modules.
Đáp án: D
Giải thích: Mục tiêu tối cao của kỹ thuật phân tách độc lập (decoupling) cấu trúc định tuyên là xé nhỏ hệ thống cầu hình tuyén đường phức tạp thành các phân vùng module nhỏ hơn (smaller), giúp nâng cao tính mạch lạc của mã nguồn và thuận tiện cho bảo trì.

What is the purpose of the action parameter in a Redux reducer function?
A. To define the structure of the Redux store
B. To specify the initial state of the reducer
C. To handle asynchronous operations
D. To describe the action being dispatched to the reducer
Đáp án: D
Giải thích: Tham số đầu vào mang tên action gửi vào hàm reducer đóng vai trò là một đối tượng mang thông tin đặc tả cụ thể hành động nào vừa được gửi di (dispatch), chứa thuộc tinh type định danh va dữ liệu bổ trợ payload nếu có.

Which component is used to create an input field in React-Bootstrap?
A. <Form.Text>
B. <Form.Control>
C. <Form.Caption>
D. <Form.Title>
Đáp án: B
Giải thích: Trong thư viện React-Bootstrap, <Form.Control> là component chuẩn hóa chuyên dụng dùng để render các ô nhập liệu (như input, textarea, select) và tự động tích hợp các lớp CSS responsive đi kèm.

Which of the following is a correct way to initialize multiple state variables using useState?
A. const [valuef, setValue1, value2, setValue2] = useState(O, 0);
B. const [value†, setValueT] = useState(O); const [value2, setValue2] = useState(O);
C. const [state, setState] = useState({ value: 0, value2: O });
D. const [valuel, value2, setValues] = useState(O, 0);
Đáp án: B
Giải thích: Khai báo nhiều biến trạng thái độc lập bằng cách tách biệt thành từng lời gọi useState riêng lẻ (phương án B) là mô hình thiết kế chuẩn khuyến nghị của React giúp mã nguồn tường minh và dễ quản lý việc cập nhật cục bộ.

What is the purpose of a package.json file in a Node.js project?
A. To store application data
B. To define routes for the web application.
C. To serve as documentation for project dependencies and their versions.
D. To compile JavaScript code.
Đáp án: C
Giải thích: Tệp package.json đóng vai trò như một bản kê khai kỹ thuật (manifest specifications) trọng tâm của dự án Nodejs, chịu trách nhiệm lưu trữ cấu hình siêu dữ liệu cùng danh sách các thư viện phụ thuộc (dependencies) và phiên bản chính xác của chúng.

What is the primary purpose of event handlers in React?
A. To manage state within a component
B. To respond to user interactions like clicking, hovering, and focusing
C. To handle server-side logic
D. To manage routing in a React application
Đáp án: B
Giải thích: Trách nhiệm cốt lõi của các hàm xử lý sự kiện (event handlers) trong lập trình Front-End là lắng nghe, đánh chặn và phan hồi trực tiếp lại các hành vi tương tác vật lý từ phía người dùng cuối như nhap chuột, di chuột hay tập trung tiêu điểm.

What is the purpose of the initial state parameter in a Redux reducer function?
A. To define the structure of the Redux store
B. To specify the actions that can be dispatched
C. To handle asynchronous operations
D. To define the initial state of the reducer
Đáp án: D
Giải thích: Tham số initialState cu ng cấp giá trị mặc định cho state khi ứng dụng khởi tạo lần đầu và Redux store gửi action khởi tạo mặc định.

Evaluate the benefits of using Redux Thunk middleware in a Redux application. Which of the following is NOT a benefit?
A. Allows for handling asynchronous actions
B. Simplifies the process of making API calls within action creators
C. Ensures that all actions are synchronous
D. Enables conditional dispatching of actions
Đáp án: C
Giải thích: Nhiệm vụ chính của Redux Thunk là cho phép viết các action creator trả về một hàm (thay vì một object) dé xử lý bat đồng bộ, do đó phát biểu "đảm bảo mọi action đều đồng bộ" là sai.

Which of the following statements about Redux selectors is true?
A. Selectors are responsible for dispatching actions
B. Selectors are used to modify the Redux store directly
C. Selectors are pure functions that derive specific data from the Redux store
D. Selectors are only used in React class components
Đáp án: C
Giải thích: Selectors là các hàm thuần khiết được sử dụng để trích xuất, tính toán hoặc định dạng lại một phần dữ liệu cụ thé từ Redux store một cách tối ưu và an toàn.

How can you configure Tailwind CSS in a Next js project?
A. By importing a CSS file directly in the component.
B. By installing the Tailwind CSS package and creating a configuration file.
C. By using a CDN link in the HTML file.
D. By installing a Tailwind CSS plugin for Next js.
Đáp án: B
Giải thích: Đề cấu hình Tailwind CSS trong dự an Nextjs, quy trình chuẩn là cài đặt các thư viện cần thiết (tailwindess, postcss, autoprefixer) và khởi tạo file cấu hình tailwind.configjs.

What are the key features of Next js?
A. Server-side rendering, Static Site Generation, Image Optimization, Built-in Routing.
B. Database integration, code debugging, and form validation.
C. CSS styling, version control, and error handling
D. Package management, command-line interface, and testing framework.
Đáp án: A
Giải thích: sức mạnh của Nextjs bao gồm SSR (render phía server), SSG (tạo trang tĩnh), tự động tối ưu ảnh và hệ thống định tuyến theo thư mục.

Which method is used to update the state in a class component?
A. setState
B. useState
C. updateState
D. changeState
Đáp án: A
Giải thích: Trong Class Component của React, phương thức xây dựng sẵn this.setState() được dùng dé cập nhật trạng thái và kích hoạt quá trình re-render giao diện.

How do you define a Type validator in PropTypes for a prop called "age" that should be a number?
A. age: PropTypes.string
B. age: PropTypes.number
C. age: PropTypes.bool
D. age: PropTypes.object
Đáp án: B
Giải thích: Thư viện prop-types cung cắp validator PropTypes.number dé xác thực thuộc tính truyền vào bat buộc phải thuộc kiểu dữ liệu số (number).

What happens if a prop fails the validation defined by a simple property validator?
A. An error will be thrown during runtime.
B. The prop will be automatically converted to the expected type.
C. The component will continue to function normally.
D. The validation will be bypassed, and the prop will be accepted.
Đáp án: C
Giải thích: Khác với TypeScript, PropTypes chỉ ghi nhận và hiển thị một cảnh báo (warning) ở màn hình console trong môi trường phát triển (development) chứ không làm sập ứng dụng, component vẫn chạy. bình thường.

What is the purpose of PropTypes?
A. To ensure type safety in React components.
B. To improve performance in React applications.
C. To handle asynchronous operations in React.
D. To enable code reusability in React components.
Đáp án: A
Giải thích: PropTypes đóng vai trò kiểm tra kiểu dữ liệu (runtime type-checking) cho các props của component, giúp phát hiện sớm các lỗi truyền sai dữ liệu giữa các thành phan.

How do you create navigation links in React Router?
A. Using the Switch> component
B. Using the component
C. Using the «Route> component
D. Using the Navigate> component
Đáp án: B
Giải thích: Component <Link> được React Router cung cấp để tạo các liên kết điều hướng mượt mà trên client-side mà không gây ra hiện tượng reload lại toàn bộ trang web.

Which code snippet demonstrates how to handle a route parameter in React Router?
A. Route path="/users/:id" component={UserDetail} />
B. Users
C. import (BrowserRouter as Router, Route ) from "react-router-dom';
D. import ( Link, Route ) from "react-router-dom':
Đáp án: A
Giải thích: Tuyến đường chứa tham sỐ động (route parameter) bắt buộc phải được khai báo bằng thuộc tính path trong thẻ <Route>, các phương án còn lại chỉ là thẻ liên kết hoặc câu lệnh import.

What does the HTTP response code 404 indicate?
A. OK
B. Created
C. Not Found
D. Internal Server Error
Đáp án: C
Giải thích: Mã trạng thái HTTP 404 thuộc nhóm lỗi phía Client (Client Error), xác nhận rằng máy chủ không tìm thấy tài nguyên ứng với URL được yêu cầu.

What is the purpose of json-server in the context of setting up a server?
A. To handle user input and interactions.
B. To display the website content.
C. To provide a static web server for serving JSON data
D. To generate dynamic server responses.
Đáp án: C
Giải thích: json-server là công cụ gọn nhẹ giúp tạo nhanh một REST API giả lập từ một file JSON tĩnh, phục vụ đắc lực cho việc phát triển và kiểm thử giao diện Front-End.

What are Higher-Order Components in React?
A. Advanced components.
B. Components written in JavaScript.
C. Components with multiple props.
D. Components with multiple states.
Đáp án: A
Giải thích: Theo tài liệu chính thức của React, HOC là một kỹ thuật nâng cao (advanced technique) dùng để tái sử dụng logic của component, thực chất nó là một hàm nhận vào một component và trả về một component mới.

Which methods are part of the Lifecycle in Class Components?
A. componentDidMount, componentDidUpdate, componentWillUnmount.
B. render, setState, forceUpdate.
C. constructor, render, componentWillUpdate.
D. componentWillReceiveProps, shouldComponentUpdate, componentDidCatch.
Đáp án: A
Giải thích: Đây là bộ ba phương thức vòng đời kinh dién đại diện day đủ cho 3 giai đoạn chính của một Class Component: Khởi tao (Mounting), Cập nhật (Updating), và Hủy bỏ (Unmounting).

Which React hook is used to manage state in functional components?
A. useEffect
B. useContext
C. useState
D. useReducer
Đáp án: C
Giải thích: Hook useState là hook cơ bản và phổ biến nhất được thiết kế dé khai báo, lưu trữ và cập nhật các trang thái (state) cục bộ bên trong một Functional Component.

What are the differences between useState and useReducer Hooks in React?
A. useState is used for managing simple state, while useReducer is used for complex state and state transitions
B. useState is a built-in Hook, while useReducer is a custom Hook.
C. useState is used for class components, while useReducer is used for functional components.
D. useState is for local component state, while useReducer is for global application state.
Đáp án: A
Giải thích: useState phù hợp cho các trạng thái đơn lẻ, độc lập; trong khi useReducer tối ưu hơn khi quan lý các state phức tạp, có nhiều thuộc tính lồng nhau hoặc luồng cập nhật phụ thuộc vào logic action phức tạp.

How would you create a custom Hook in React?
A. By defining a function that uses other built-in Hooks.
B. By extending the React. Component class.
C. By wrapping a class component with a functional component.
D. By using the createCustomHook function.
Đáp án: A
Giải thích: Custom Hook đơn thuần là một ham JavaScript có tên bắt đầu bằng từ khóa use, dùng để đóng gói và tái sử dụng các logic trạng thái bằng cách gọi các Hook xây dựng sẵn khác của React.

How can you safely remove an unnecessary dependency from an Effect?
A. Remove all dependencies from the array.
B. Use an empty dependency array [] to ensure the Effect only runs once.
C. Keep all dependencies and accept performance issues.
D. Replace usEffect with useLayoutEffect.
Đáp án: B
Giải thích: Khi một dependency được xác định là không cần thiết cho việc re-run logic của Effect, việc chuyển về mảng rỗng [] sẽ đảm bảo Effect đó chỉ thực thi một lần duy nhất sau lượt render đầu tiên.

How can you access Chrome DevTools?
A. By pressing F12 or right-clicking and selecting "Inspect"
B. By installing a Chrome extension
C. By typing "chrome://devtools" in the address bar
D. By opening the Chrome menu and selecting "Dev Tools"
Đáp án: A
Giải thích: Nhắn phím F12 hoặc click chuột phải chon "Inspect" (Kiểm tra) là hai Idi tắt tiêu chuẩn và nhanh nhất được tích hop sẵn trên các trình duyệt Chromium để mở bảng công cụ DevTools.

What are the key features of React?
A. Two-way data binding
B. Virtual DOM
C. SOL database integration
D. Automatic styling
Đáp án: B
Giải thích: Virtual DOM (DOM ảo) là tính năng mang tính kiến trúc cốt lõi của React, giúp tăng tốc độ cập nhật giao diện bằng cách tính toán các thay đổi tồi thiểu trước khi đồng bộ lên Real DOM.

How can you configure Git with your name and email address?
A. By running "git config --global user.name "Your Name" and "git config --global user.email "Your Email"
B. By creating a gitignore file
C. By committing changes using "git commit -m"
D. By pushing changes to a remote repository
Đáp án: A
Giải thích: Cú pháp lệnh git config --global được dùng để thiết lập cấu hình định danh toàn cục cho tài khoản người dùng trên máy tính cá nhân làm việc với Git

Which feature of ES6 is used to iterate over the elements of an array?
A. Spread syntax
B. Destructuring assignment
C. Arrow functions
D. for...of loop
Đáp án: D
Giải thích: Vòng lặp for...of là cú pháp lặp mới được giới thiệu trong ES6 chuyên dùng để duyệt qua các giá trị của các đối tượng có cầu trúc lặp (iterable object) như Mang (Array).

How does the Grid component in React-Bootstrap help in creating a responsive layout?
A. The Grid component allows you to define a flexible grid system with rows and columns that automatically adjusts based on the screen size.
B. The Grid component provides pre-built responsive layouts that you can directly use in your application.
C. The Grid component automatically resizes and repositions the elements based on the available space.
D. The Grid component helps in aligning the elements vertically and horizontally on the page.
Đáp án: A
Giải thích: Hệ thống Grid trong React-Bootstrap (Container, Row, Col) áp dụng cơ ché flexbox kết hợp các breakpoint giúp chia màn hình thành 12 cột và tự động co giãn theo kích thước thiết bị.

Which React-Bootstrap components are used to create navigation menus?
A. Navbars, Navs, Tabs
B. Alert, Card
C. Button, Checkbox
D. Modal, Listbox
Đáp án: A
Giải thích: . Nhóm thành phan Navbar (thanh điều hướng), Nav (liên kết menu), va Tabs (tab chuyển đổi) là các Ul component chuyên biệt trong Bootstrap phục vụ mục đích xây dựng hệ thống menu dẫn hướng.

Which of the following is a utility-first CSS framework that is often used with Next.js?
A. Bootstrap
B. Material-UI
C. Tailwind CSS
D. Bulma
Đáp án: C
Giải thích: Tailwind CSS được định nghĩa chuẩn xác là một "utility-first CSS framework", cung cấp các class nhỏ gọn để dựng giao diện trực tiếp và là bộ đôi phổ biến nhất khi đi kèm Nextjs.

What is Tailwind CSS?
A. A JavaScript framework for building single-page applications.
B. A programming language used for backend development.
C. Autility-first CSS framework for building responsive web interfaces.
D. A database management system for storing CSS styles.
Đáp án: C
Giải thích: Định nghĩa chính thức của Tailwind CSS là mét framework CSS theo triết lý "utility-first" giúp lập trình viên Front-End thiết kế giao diện linh hoạt, phản hồi cao (responsive) một cách nhanh chóng.

Which of the following is a feature of Next.js?
A. ACSS framework for styling web applications.
B. A server-side rendering framework for React.
C. Astate management library for React applications.
D. A testing framework for JavaScript applications.
Đáp án: B
Giải thích: Khác biệt lớn nhất của Nextjs so với ứng dụng React thuần (SPA) là khả năng hỗ trợ đắc lực cơ chế kết xuất mã nguồn phía máy chủ (Server-Side Rendering).

What is the purpose of the next/link module in Next. js?
A. It is used for handling form submissions.
B. It provides client-side routing capabilities.
C. Itis responsible for server-side rendering.
D. It enables serverless function deployment.
Đáp án: B
Giải thích: Module next/link cung cấp component <Link> giúp kích hoạt tính năng điều hướng phía Client (client-side navigation), giúp việc chuyển trang diễn ra tức thì mà không cần load lại tài nguyên HTML.

How would you combine fluid and pixel widths behaviors in a grid layout using Bootstrap5?
A. Use container-fluid for the entire layout
B. Combine .container with col-fluid
C. Use a fixed-width class with a media query
D. Use container-md to apply a responsive container at the md breakpoint
Đáp án: D
Giải thích: Lớp .container-md có đặc tinh: Co giãn 100% chiều rộng (fluid) ở các màn hình nhỏ dưới mức md, nhưng khi đạt từ breakpoint md trở lên sẽ chuyển thành độ rộng pixel cố định (fixed width).

How does the Bootstrap grid system help in designing responsive websites?
A. By providing pre-designed website templates.
B. By automatically adjusting the font sizes based on the screen size.
C. By allowing the layout to adapt to different screen sizes using a 12-column responsive grid system.
D. By optimizing the website for search engines.
Đáp án: C
Giải thích: Bootstrap Grid sử dụng hệ thống lưới chia làm 12 cột linh hoạt phối hợp cùng Media Queries để cấu trúc lại giao diện hiển thị sao cho phù hợp nhất với mọi kích thước màn hình vật lý.

What would happen if you didn't include the class="form-control" in your element?
A. The input would not be submitted with the form
B. The input would fail client-side validation
C. The input field would revert to the browser's default styles
D. The input field would become non-responsive
Đáp án: C
Giải thích: Lớp form-control của Bootstrap đảm nhận việc áp các thuộc tính style (border, padding, focus state) cho thẻ input; thiếu nó, phần tử sẽ quay về định dang thô mặc định của trình duyệt hệ điều hành.

Which method is commonly used to transform an array of data into a list of components in React?
A. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.filter(item => <li>{item}</li>);
B. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.map(item => <li>{item}</li>);
C. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.forEach(item => <li>{item}</li>);
D. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.reduce(item => <li>{item}</li>);
Đáp án: B
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án B.)

Create a React component that uses the Suspense component to display a fallback while loading a lazily loaded component. Which code snippet is correct?
A. import React, { lazy, Suspense } from 'react'; const MyComponent = lazy(() => import('./MyComponent')); function App() { return ( <Suspense fallback={<div>Loading...</div>}><MyComponent /></Suspense> ); } export default App;
B. import React, { Suspense } from 'react'; const MyComponent = import('./MyComponent'); function App() { return ( <Suspense fallback={<div>Loading...</div>}><MyComponent /></Suspense> ); } export default App;
C. import React, { lazy } from 'react'; const MyComponent = lazy('./MyComponent'); function App() { return ( <div fallback={<div>Loading...</div>}><MyComponent /></div> ); } export default App;
D. import React from 'react'; const MyComponent = React.lazy(() => import('./MyComponent')); function App() { return ( <React.Suspense><MyComponent /></React.Suspense> ); } export default App;
Đáp án: A
Giải thích: Nguồn không cung cấp giải thích chi tiết, chỉ ghi nhận đáp án A: dùng lazy() để import động component và bọc nó trong <Suspense fallback={...}>.

const server = jsonServer.create(); const router = jsonServer.router('data.json'); const port = 3000; server.use(router); server.listen(port, () => console.log(`JSON server is running on port ${port}`)); What is the above code used for?
A. Create a dynamic server to serve JSON data.
B. Create a dynamic web application using JSON data.
C. Create a JSON file based on data from the server.
D. Configure the development environment for the project using JSON.
Đáp án: A
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án A.)

Select the code snippet that correctly defines a Higher-Order Component in React using an arrow function with a named function.
A. function withLogger(WrappedComponent) { return class extends React.Component { /* HOC implementation */ } }
B. const withLogger = (WrappedComponent) => { return class extends React.Component { /* HOC implementation */ } }
C. const withLogger = (WrappedComponent) => { return function HOC() { /* HOC implementation */ } } }
D. function withLogger(WrappedComponent) { return function HOC() { /* HOC implementation */ }; }
Đáp án: C
Giải thích: Nguồn không cung cấp giải thích chi tiết, chỉ ghi nhận đáp án C: dùng arrow function bọc một named function HOC() bên trong.